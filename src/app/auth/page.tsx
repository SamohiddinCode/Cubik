import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { CubikMark } from "@/components/cubik-mark";

export default function AuthPage() {
  return (
    <main className="authPage">
      <section className="authCard">
        <div className="authBrand"><CubikMark size={42} /><span>CUBIK</span></div>
        <div>
          <p className="eyebrow plain">Добро пожаловать</p>
          <h1>Начнём с вашего дня</h1>
          <p className="muted">В демо-версии данные сохраняются только в браузере.</p>
        </div>
        <button className="oauthButton" type="button">G&nbsp;&nbsp; Продолжить с Google</button>
        <div className="divider"><span>или</span></div>
        <label className="fieldLabel" htmlFor="email">Email</label>
        <input className="field" id="email" placeholder="you@example.com" type="email" />
        <Link className="button full" href="/app/today">Продолжить <ArrowRight size={18} /></Link>
        <p className="legal">Продолжая, вы принимаете условия и политику конфиденциальности.</p>
      </section>
    </main>
  );
}
