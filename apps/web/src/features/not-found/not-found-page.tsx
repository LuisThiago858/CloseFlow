import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="feedback-card">
        <p className="eyebrow">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p>O endereço informado não existe ou foi movido.</p>
        <Link className="button-link" to="/">
          Voltar ao início
        </Link>
      </section>
    </main>
  );
}
