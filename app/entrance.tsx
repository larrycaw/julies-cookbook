import EmailLogin from "./email-login";
import { emailAuth } from "@/lib/auth-config";

export default function Entrance() { return <EmailLogin auth={emailAuth}/>; }
