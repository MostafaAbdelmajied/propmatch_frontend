import { ConversationView } from "@/src/features/messages/components/ConversationView";
export default async function Page({params}:{params:Promise<{matchConnectionId:string}>}){const {matchConnectionId}=await params;return <ConversationView matchConnectionId={matchConnectionId}/>;}
