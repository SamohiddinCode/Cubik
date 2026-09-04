import { ArrowRight, BrainCircuit, CircleDollarSign, Clock3, Goal } from "lucide-react";
import Link from "next/link";
import { CubikMark } from "@/components/cubik-mark";

export default function LandingPage() {
  return (
    <main className="landing">
      <nav className="landingNav">
        <Link className="brand" href="/">
          <CubikMark size={30} />
          <span>CUBIK</span>
        </Link>
        <div className="navActions">
          <Link className="textButton" href="/auth">Войти</Link>
          <Link className="button compact" href="/auth">Начать бесплатно</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="eyebrow"><span /> Life OS для ясных решений</div>
        <h1>Соберите жизнь<br />в одну систему.</h1>
        <p className="heroCopy">
          CUBIK связывает задачи, цели и деньги, чтобы каждый день двигал вас в нужном направлении — без перегрузки.
        </p>
        <div className="heroActions">
          <Link className="button" href="/auth">Создать первый план <ArrowRight size={18} /></Link>
          <Link className="secondaryButton" href="/app/today">Открыть демо</Link>
        </div>
      </section>

      <section className="promiseGrid">
        <article><Clock3 /><h2>Planner</h2><p>Сегодня, календарь, фокус и привычки в одном ритме.</p></article>
        <article><Goal /><h2>Goals</h2><p>Каждая задача связана с направлением, которое имеет смысл.</p></article>
        <article><CircleDollarSign /><h2>Money</h2><p>Понимайте доступный бюджет и цену своих целей.</p></article>
        <article><BrainCircuit /><h2>CUBIK AI</h2><p>Получайте объяснимые предложения, которые применяются только после подтверждения.</p></article>
      </section>
    </main>
  );
}
