import UserDetailPage from "@/features/admin-users/components/user-detail-page"

type PageProps = {
  params: Promise<{ userId: string }>
}

export default async function Page({ params }: PageProps) {
  const { userId } = await params
  return <UserDetailPage userId={userId} />
}
