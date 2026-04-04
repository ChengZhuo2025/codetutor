import { UserDetail } from "./user-detail"

type UserDetailPageProps = {
  userId: string
}

export default function UserDetailPage({ userId }: UserDetailPageProps) {
  return <UserDetail userId={userId} />
}
