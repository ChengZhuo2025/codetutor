import test from "node:test"
import assert from "node:assert/strict"

import {
  resolveTtsProtocol,
  synthesizeTextToSpeech,
} from "../server/modules/learning/tts/registry.ts"
import type { MaterialPipelineRuntime } from "../server/modules/learning-materials/providers.ts"
import { LearningAIProviderError, LearningConfigurationError } from "../server/modules/learning/errors.ts"

type RuntimePatch = {
  provider?: Partial<MaterialPipelineRuntime["provider"]>
  model?: Partial<MaterialPipelineRuntime["model"]>
}

const baseRuntime: MaterialPipelineRuntime = {
  provider: {
    code: "aliyuncs",
    providerType: "openai_compatible",
    baseUrl: "https://dashscope.aliyuncs.com/compatible-mode/v1",
    authMode: "bearer",
    envSecretRef: "TEST_TTS_API_KEY",
    secretCiphertext: null,
    secretIv: null,
    secretAuthTag: null,
    secretKeyVersion: null,
    timeoutMs: 12000,
    retryCount: 0,
  },
  model: {
    code: "qwen3-tts-flash",
    modelName: "qwen3-tts-flash",
    defaultMaxOutputTokens: 2048,
    recommendedTemperature: null,
    metadata: {},
  },
}

function withRuntime(patch: RuntimePatch): MaterialPipelineRuntime {
  return {
    provider: {
      ...baseRuntime.provider,
      ...patch.provider,
    },
    model: {
      ...baseRuntime.model,
      ...patch.model,
    },
  }
}

function jsonResponse(body: unknown, init?: ResponseInit) {
  return new Response(JSON.stringify(body), {
    status: init?.status ?? 200,
    headers: {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(init?.headers).entries()),
    },
  })
}

test("resolveTtsProtocol prefers explicit metadata protocol", () => {
  assert.equal(
    resolveTtsProtocol(withRuntime({
      model: {
        metadata: {
          ttsProtocol: "dashscope_realtime",
        },
      },
    })),
    "dashscope_realtime",
  )
})

test("resolveTtsProtocol infers supported HTTP TTS providers", () => {
  assert.equal(resolveTtsProtocol(baseRuntime), "dashscope_http_qwen")
  assert.equal(
    resolveTtsProtocol(withRuntime({
      provider: { code: "minimax", baseUrl: "https://api.minimax.chat" },
      model: { code: "speech-2.8-hd", modelName: "speech-2.8-hd" },
    })),
    "minimax_t2a_v2",
  )
  assert.equal(
    resolveTtsProtocol(withRuntime({
      provider: {
        code: "siliconflow",
        providerType: "siliconflow",
        baseUrl: "https://api.siliconflow.cn/v1",
      },
      model: {
        code: "cosyvoice2",
        modelName: "FunAudioLLM/CosyVoice2-0.5B",
        metadata: {
          voice: "FunAudioLLM/CosyVoice2-0.5B:alex",
        },
      },
    })),
    "openai_audio_speech",
  )
})

test("resolveTtsProtocol rejects unsupported TTS model configuration", () => {
  assert.throws(
    () => resolveTtsProtocol(withRuntime({
      provider: { code: "unknown", baseUrl: "https://example.test/v1" },
      model: { code: "custom-tts", modelName: "custom-tts" },
    })),
    LearningConfigurationError,
  )
})

test("synthesizeTextToSpeech calls DashScope HTTP Qwen and downloads audio URL", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const calls: Array<{ url: string; body?: unknown; authorization?: string | null }> = []
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    const urlText = String(url)
    calls.push({
      url: urlText,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: init?.headers instanceof Headers
        ? init.headers.get("authorization")
        : new Headers(init?.headers).get("authorization"),
    })

    if (urlText.includes("/services/aigc/multimodal-generation/generation")) {
      return jsonResponse({
        output: {
          audio: {
            url: "https://dashscope-result.example/audio.wav",
          },
        },
      })
    }

    return new Response(Buffer.from("RIFF....WAVE", "ascii"), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
      },
    })
  }

  const result = await synthesizeTextToSpeech({
    runtime: withRuntime({
      model: {
        metadata: {
          voice: "Cherry",
          languageType: "Chinese",
          rate: 0,
        },
      },
    }),
    text: "你好，我是 CodeTutor AI 教练。",
    fetchImpl,
  })

  assert.equal(result.contentType, "audio/wav")
  assert.equal(result.audio.toString("ascii"), "RIFF....WAVE")
  assert.equal(calls[0].url, "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation")
  assert.equal(calls[0].authorization, "Bearer sk-test")
  assert.deepEqual(calls[0].body, {
    model: "qwen3-tts-flash",
    input: {
      text: "你好，我是 CodeTutor AI 教练。",
      voice: "Cherry",
      language_type: "Chinese",
    },
    parameters: {
      rate: 0,
    },
  })
  assert.equal(calls[1].url, "https://dashscope-result.example/audio.wav")
})

test("synthesizeTextToSpeech maps shared speech speed across supported adapters", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const qwenCalls: unknown[] = []
  await synthesizeTextToSpeech({
    runtime: withRuntime({
      model: {
        metadata: {
          speechSpeed: 1.12,
        },
      },
    }),
    text: "请朗读这句话。",
    fetchImpl: async (url: string | URL | Request, init?: RequestInit) => {
      if (String(url).includes("/services/aigc/multimodal-generation/generation")) {
        qwenCalls.push(JSON.parse(String(init?.body)))
        return jsonResponse({
          output: {
            audio: {
              url: "https://dashscope-result.example/audio.wav",
            },
          },
        })
      }
      return new Response(Buffer.from("RIFF....WAVE", "ascii"), {
        status: 200,
        headers: { "Content-Type": "audio/wav" },
      })
    },
  })
  assert.equal((qwenCalls[0] as { parameters: { rate: number } }).parameters.rate, 60)

  const miniMaxCalls: unknown[] = []
  await synthesizeTextToSpeech({
    runtime: withRuntime({
      provider: {
        code: "minimax",
        baseUrl: "https://api.minimax.chat",
      },
      model: {
        code: "speech-2.8-hd",
        modelName: "speech-2.8-hd",
        metadata: {
          speechSpeed: 1.12,
        },
      },
    }),
    text: "请朗读这句话。",
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      miniMaxCalls.push(JSON.parse(String(init?.body)))
      return jsonResponse({
        data: {
          audio: "52494646",
        },
        extra_info: {
          audio_format: "mp3",
        },
      })
    },
  })
  assert.equal((miniMaxCalls[0] as { voice_setting: { speed: number } }).voice_setting.speed, 1.12)

  const openAICalls: unknown[] = []
  await synthesizeTextToSpeech({
    runtime: withRuntime({
      provider: {
        code: "siliconflow",
        providerType: "siliconflow",
        baseUrl: "https://api.siliconflow.cn/v1",
      },
      model: {
        code: "cosyvoice2",
        modelName: "FunAudioLLM/CosyVoice2-0.5B",
        metadata: {
          speechSpeed: 1.12,
        },
      },
    }),
    text: "请朗读这句话。",
    fetchImpl: async (_url: string | URL | Request, init?: RequestInit) => {
      openAICalls.push(JSON.parse(String(init?.body)))
      return new Response(Buffer.from([1, 2, 3, 4]), {
        status: 200,
        headers: { "Content-Type": "audio/mpeg" },
      })
    },
  })
  assert.equal((openAICalls[0] as { speed: number }).speed, 1.12)
})

test("synthesizeTextToSpeech rejects unsafe DashScope audio URLs before download", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const calls: string[] = []
  const fetchImpl = async (url: string | URL | Request) => {
    calls.push(String(url))
    if (String(url).includes("/services/aigc/multimodal-generation/generation")) {
      return jsonResponse({
        output: {
          audio: {
            url: "http://127.0.0.1/internal.wav",
          },
        },
      })
    }
    throw new Error("unsafe audio URL should not be downloaded")
  }

  await assert.rejects(
    synthesizeTextToSpeech({
      runtime: baseRuntime,
      text: "请朗读这句话。",
      fetchImpl,
    }),
    LearningAIProviderError,
  )
  assert.equal(calls.length, 1)
})

test("synthesizeTextToSpeech allows DashScope HTTP audio URLs on trusted Aliyun hosts", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const calls: string[] = []
  const fetchImpl = async (url: string | URL | Request) => {
    const urlText = String(url)
    calls.push(urlText)
    if (urlText.includes("/services/aigc/multimodal-generation/generation")) {
      return jsonResponse({
        output: {
          audio: {
            url: "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/audio.wav",
          },
        },
      })
    }

    return new Response(Buffer.from("RIFF....WAVE", "ascii"), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
      },
    })
  }

  const result = await synthesizeTextToSpeech({
    runtime: baseRuntime,
    text: "请朗读这句话。",
    fetchImpl,
  })

  assert.equal(result.contentType, "audio/wav")
  assert.equal(calls[1], "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/audio.wav")
})

test("resolveTtsProtocol routes Aliyun MiniMax speech-2.8 turbo through DashScope HTTP", () => {
  assert.equal(
    resolveTtsProtocol(withRuntime({
      provider: {
        code: "aliyuncs",
        providerType: "openai_compatible",
        baseUrl: "https://dashscope.aliyuncs.com/api/v1",
      },
      model: {
        code: "minimax-speech-2-8-turbo",
        modelName: "MiniMax/speech-2.8-turbo",
      },
    })),
    "dashscope_http_minimax",
  )
})

test("synthesizeTextToSpeech uses DashScope generation endpoint for Aliyun MiniMax turbo", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const calls: Array<{ url: string; body?: unknown; authorization?: string | null }> = []
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    const urlText = String(url)
    calls.push({
      url: urlText,
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      authorization: init?.headers instanceof Headers
        ? init.headers.get("authorization")
        : new Headers(init?.headers).get("authorization"),
    })

    if (urlText.includes("/services/aigc/multimodal-generation/generation")) {
      return jsonResponse({
        output: {
          audio: {
            url: "http://dashscope-result-bj.oss-cn-beijing.aliyuncs.com/audio.wav",
          },
        },
      })
    }

    return new Response(Buffer.from("RIFF....WAVE", "ascii"), {
      status: 200,
      headers: {
        "Content-Type": "audio/wav",
      },
    })
  }

  const result = await synthesizeTextToSpeech({
    runtime: withRuntime({
      provider: {
        code: "aliyuncs",
        providerType: "openai_compatible",
        baseUrl: "https://dashscope.aliyuncs.com/api/v1",
      },
      model: {
        code: "minimax-speech-2-8-turbo",
        modelName: "MiniMax/speech-2.8-turbo",
        metadata: {},
      },
    }),
    text: "请朗读这句话。",
    fetchImpl,
  })

  assert.equal(result.contentType, "audio/wav")
  assert.equal(calls[0].url, "https://dashscope.aliyuncs.com/api/v1/services/aigc/multimodal-generation/generation")
  assert.deepEqual(calls[0].body, {
    model: "MiniMax/speech-2.8-turbo",
    input: {
      text: "请朗读这句话。",
      voice: "male-qn-qingse",
      language: "zh",
    },
    parameters: {
      rate: 0,
    },
  })
})

test("synthesizeTextToSpeech decodes MiniMax hex audio", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const calls: Array<{ url: string; body?: unknown }> = []
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
    })
    return jsonResponse({
      data: {
        audio: "52494646",
      },
      extra_info: {
        audio_format: "mp3",
      },
    })
  }

  const result = await synthesizeTextToSpeech({
    runtime: withRuntime({
      provider: {
        code: "minimax",
        baseUrl: "https://api.minimax.chat",
      },
      model: {
        code: "speech-2.8-hd",
        modelName: "speech-2.8-hd",
        metadata: {
          voice: "male-qn-qingse",
          format: "mp3",
          sampleRate: 32000,
          bitrate: 128000,
          languageBoost: "auto",
        },
      },
    }),
    text: "请朗读这句话。",
    fetchImpl,
  })

  assert.equal(result.contentType, "audio/mpeg")
  assert.deepEqual([...result.audio], [0x52, 0x49, 0x46, 0x46])
  assert.equal(calls[0].url, "https://api.minimax.chat/v1/t2a_v2")
  assert.deepEqual(calls[0].body, {
    model: "speech-2.8-hd",
    text: "请朗读这句话。",
    stream: false,
    output_format: "hex",
    voice_setting: {
      voice_id: "male-qn-qingse",
      speed: 1,
    },
    audio_setting: {
      sample_rate: 32000,
      bitrate: 128000,
      format: "mp3",
      channel: 1,
    },
    language_boost: "auto",
  })
})

test("synthesizeTextToSpeech handles OpenAI-compatible binary speech response", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(url), "https://api.siliconflow.cn/v1/audio/speech")
    assert.deepEqual(JSON.parse(String(init?.body)), {
      model: "FunAudioLLM/CosyVoice2-0.5B",
      input: "请朗读这句话。",
      voice: "FunAudioLLM/CosyVoice2-0.5B:alex",
      response_format: "mp3",
      speed: 1,
    })
    return new Response(Buffer.from([1, 2, 3, 4]), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  }

  const result = await synthesizeTextToSpeech({
    runtime: withRuntime({
      provider: {
        code: "siliconflow",
        providerType: "siliconflow",
        baseUrl: "https://api.siliconflow.cn/v1",
      },
      model: {
        code: "cosyvoice2",
        modelName: "FunAudioLLM/CosyVoice2-0.5B",
        metadata: {
          ttsProtocol: "openai_audio_speech",
          voice: "FunAudioLLM/CosyVoice2-0.5B:alex",
          responseFormat: "mp3",
        },
      },
    }),
    text: "请朗读这句话。",
    fetchImpl,
  })

  assert.equal(result.contentType, "audio/mpeg")
  assert.deepEqual([...result.audio], [1, 2, 3, 4])
})

test("synthesizeTextToSpeech defaults SiliconFlow CosyVoice voice to model-prefixed alex", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  const fetchImpl = async (url: string | URL | Request, init?: RequestInit) => {
    assert.equal(String(url), "https://api.siliconflow.cn/v1/audio/speech")
    assert.deepEqual(JSON.parse(String(init?.body)), {
      model: "FunAudioLLM/CosyVoice2-0.5B",
      input: "请朗读这句话。",
      voice: "FunAudioLLM/CosyVoice2-0.5B:alex",
      response_format: "mp3",
      speed: 1,
    })
    return new Response(Buffer.from([1, 2, 3, 4]), {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
      },
    })
  }

  const result = await synthesizeTextToSpeech({
    runtime: withRuntime({
      provider: {
        code: "siliconflow",
        providerType: "siliconflow",
        baseUrl: "https://api.siliconflow.cn/v1",
      },
      model: {
        code: "cosyvoice2",
        modelName: "FunAudioLLM/CosyVoice2-0.5B",
        metadata: {},
      },
    }),
    text: "请朗读这句话。",
    fetchImpl,
  })

  assert.equal(result.contentType, "audio/mpeg")
  assert.deepEqual([...result.audio], [1, 2, 3, 4])
})

test("synthesizeTextToSpeech rejects oversized binary speech responses before buffering", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  await assert.rejects(
    synthesizeTextToSpeech({
      runtime: withRuntime({
        provider: {
          code: "siliconflow",
          providerType: "siliconflow",
          baseUrl: "https://api.siliconflow.cn/v1",
        },
        model: {
          code: "cosyvoice2",
          modelName: "FunAudioLLM/CosyVoice2-0.5B",
          metadata: {
            ttsProtocol: "openai_audio_speech",
          },
        },
      }),
      text: "请朗读这句话。",
      fetchImpl: async () => new Response(Buffer.from([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
          "Content-Length": String(20 * 1024 * 1024),
        },
      }),
    }),
    LearningAIProviderError,
  )
})

test("synthesizeTextToSpeech retries retryable provider failures", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  let attempts = 0
  const result = await synthesizeTextToSpeech({
    runtime: withRuntime({
      provider: {
        code: "siliconflow",
        providerType: "siliconflow",
        baseUrl: "https://api.siliconflow.cn/v1",
        retryCount: 1,
      },
      model: {
        code: "cosyvoice2",
        modelName: "FunAudioLLM/CosyVoice2-0.5B",
        metadata: {
          ttsProtocol: "openai_audio_speech",
        },
      },
    }),
    text: "请朗读这句话。",
    fetchImpl: async () => {
      attempts += 1
      if (attempts === 1) {
        return jsonResponse({ error: "temporary" }, { status: 502 })
      }
      return new Response(Buffer.from([1, 2, 3, 4]), {
        status: 200,
        headers: {
          "Content-Type": "audio/mpeg",
        },
      })
    },
  })

  assert.equal(attempts, 2)
  assert.deepEqual([...result.audio], [1, 2, 3, 4])
})

test("synthesizeTextToSpeech maps invalid upstream audio payloads to provider errors", async () => {
  process.env.TEST_TTS_API_KEY = "sk-test"
  await assert.rejects(
    synthesizeTextToSpeech({
      runtime: withRuntime({
        provider: {
          code: "minimax",
          baseUrl: "https://api.minimax.chat",
        },
        model: {
          code: "speech-2.8-hd",
          modelName: "speech-2.8-hd",
        },
      }),
      text: "请朗读这句话。",
      fetchImpl: async () => jsonResponse({ data: { audio: "not-hex" } }),
    }),
    LearningAIProviderError,
  )
})
