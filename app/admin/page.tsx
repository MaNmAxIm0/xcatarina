import { requireChatGPTUser } from "../chatgpt-auth";
import { AdminUploader } from "./AdminUploader";
export const dynamic="force-dynamic";
export default async function AdminPage(){const user=await requireChatGPTUser("/admin");return <AdminUploader email={user.email}/>}
