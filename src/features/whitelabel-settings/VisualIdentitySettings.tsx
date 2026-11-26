import { configHref } from './configRoute'
import s from './VisualIdentitySettings.module.css'

export function VisualIdentitySettings({ id }: { id: string }) {
  return <section className={s.panel} aria-labelledby="visual-identity-title">
    <h2 id="visual-identity-title">Identidade visual</h2>
    <section>
      <h3>Marca global (runtime)</h3>
      <p>Logo e cor primária compartilhadas pelo bootstrap dos fronts e pelos e-mails (mesma célula <code>email_branding.config</code>).</p>
      <ul>
        <li><a href={configHref(id, 'platform', 'email_branding.config', { env: 'investor', resource: 'marca_global' })}>Studio · Marca global</a></li>
        <li><a href={`#/whitelabels/${encodeURIComponent(id)}/emails?section=branding`}>E-mail · mesma identidade</a></li>
      </ul>
    </section>
    <section>
      <h3>Entrada do investidor</h3>
      <p>O Login define o painel da marca, o formulário e a imagem de fundo da jornada Web. Cadastro, recuperação de senha, dados básicos e verificação de identidade compartilham essa aparência.</p>
      <ul>
        <li><a href={configHref(id, 'platform', 'login.entry_presentation', { env: 'investor', resource: 'login' })}>Cor da lateral e layout</a></li>
        <li><a href={configHref(id, 'platform', 'login.main_area_image', { env: 'investor', resource: 'login' })}>Banner do Login</a></li>
        <li><a href={configHref(id, 'platform', 'login.title', { env: 'investor', resource: 'login' })}>Textos do painel da marca</a></li>
        <li><a href={configHref(id, 'platform', 'register.content', { env: 'investor', resource: 'register' })}>Textos e prévia do cadastro</a></li>
      </ul>
    </section>
    <section>
      <h3>Favicon / PWA / build</h3>
      <p>Ícones de aplicativo instalado e assets de build não são editáveis neste Studio.</p>
    </section>
  </section>
}
