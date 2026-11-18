import { configHref } from './configRoute'
import s from './VisualIdentitySettings.module.css'

export function VisualIdentitySettings({ id }: { id: string }) {
  return <section className={s.panel} aria-labelledby="visual-identity-title">
    <h2 id="visual-identity-title">Identidade visual</h2>
    <section>
      <h3>Entrada do investidor</h3>
      <p>O Login define o painel da marca, o formulário e a imagem de fundo da jornada Web. Cadastro, recuperação de senha, dados básicos e verificação de identidade compartilham essa aparência.</p>
      <ul>
        <li><a href={configHref(id, 'platform', 'login.entry_presentation')}>Cores, disposição e formulário</a></li>
        <li><a href={configHref(id, 'platform', 'login.main_area_image')}>Imagem da área principal</a></li>
        <li><a href={configHref(id, 'platform', 'login.title')}>Textos do painel da marca</a></li>
        <li><a href={configHref(id, 'platform', 'register.content')}>Textos e prévia do cadastro</a></li>
        <li><a href={configHref(id, 'platform', 'quick_profile.appearance')}>Prévia dos dados básicos</a></li>
      </ul>
    </section>
    <section>
      <h3>Mensagens de e-mail</h3>
      <p>A cor principal e a logo se aplicam aos modelos de e-mail transacional deste Whitelabel.</p>
      <a href={`#/whitelabels/${encodeURIComponent(id)}/emails?section=branding`}>Cor, logo e prévia do e-mail</a>
    </section>
    <section>
      <h3>Marca institucional e aplicativo instalado</h3>
      <p>A logo do site, a cor institucional e os ícones do aplicativo instalado vêm da configuração de build e dos arquivos de marca do site. A edição global depende de um contrato de marca consumido por essas superfícies.</p>
    </section>
  </section>
}
