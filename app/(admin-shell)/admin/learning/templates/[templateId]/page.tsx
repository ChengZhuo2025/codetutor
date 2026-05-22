import { LearningTemplateEditorPage } from "@/features/admin-learning-templates/components/learning-template-editor-page"

export default function Page({ params }: { params: Promise<{ templateId: string }> }) {
  return <LearningTemplateEditorPage params={params} />
}
