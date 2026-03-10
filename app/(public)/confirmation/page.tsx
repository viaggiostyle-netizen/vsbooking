import ConfirmationScreen from "@/components/confirmation/ConfirmationScreen"

export default async function ConfirmationPage({
  searchParams,
}: {
  searchParams: Promise<{ group?: string }>
}) {
  const params = await searchParams
  const groupId = params.group ?? ""

  return <ConfirmationScreen groupId={groupId} />
}
