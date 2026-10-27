import { LockKeyhole, Search } from 'lucide-react'
import { valueAt, type Json } from './configurationContract'
import { businessText } from '../operation/shared/businessPresentation'
import s from './ConfigurationStudio.module.css'

/** Admin PlatformAppMobilePreview / AuthenticatedPreview hierarchy, adapted to CSS modules.
 * Missing copy is labeled, never filled into a persisted configuration. */
export function AppConfigurationPreview({value,screen='login',tenantName}:{value:Json;screen?:string;tenantName:string}) {
  const text=(key:string)=>{
    const raw=valueAt(value,['screens',screen,key])
    return typeof raw==='string'?businessText(raw,4000)??'Conteúdo indisponível':'Padrão do App · não informado'
  }
  const field=(label:string)=><div className={s.sampleField}>{label}</div>
  const action=(key:string)=><div className={s.appAction}>{text(key)}</div>
  return <div className={s.phone} aria-label="Prévia representativa do aplicativo"><div className={s.phoneBar}>9:41 <span aria-hidden="true">● ▰</span></div><strong>{tenantName}</strong><div className={s.phoneContent}>
    {screen==='login'&&<><LockKeyhole size={18}/><h4>Acesso ao aplicativo</h4>{field('Login *')}{field('Senha *')}<p className={s.appLink}>{text('recoverPasswordLabel')}</p>{action('submitLabel')}<p>{text('registrationPrompt')} <strong>{text('registrationActionLabel')}</strong></p></>}
    {screen==='registration'&&<><small>ETAPA DE DADOS</small><h4>{text('detailsTitle')}</h4>{field('Nome completo *')}<p>{text('fullNameHelper')}</p>{action('detailsContinueLabel')}<hr/><small>ETAPA DE SENHA</small><h4>{text('passwordTitle')}</h4><p>{text('passwordDescription')}</p>{field('Digite sua senha *')}{action('passwordContinueLabel')}</>}
    {screen==='passwordRecovery'&&<><h4>{text('title')}</h4><p>{text('description')}</p>{field('Endereço de e-mail *')}{action('continueLabel')}<p className={s.appLink}>{text('backToLoginLabel')}</p></>}
    {screen==='completeRegistration'&&<><small>PÓS-CADASTRO · APRESENTAÇÃO</small><h4>{text('personalDataTitle')}</h4>{field('Órgão emissor *')}<p>{text('issuingEntityHelper')}</p>{field('Nacionalidade *')}<p>{text('nationalityHelper')}</p>{field('Renda anual *')}<p>{text('annualIncomeHelper')}</p><hr/><h4>{text('addressTitle')}</h4>{field('CEP *')}<h4>{text('bankDataTitle')}</h4>{field('Selecione um banco *')}</>}
    {screen==='wallet'&&<><h4>{text('investedOpportunitiesTitle')}</h4><div className={s.skeleton} aria-label="Espaço ilustrativo dos indicadores"/><hr/><h4>{text('availableOpportunitiesTitle')}</h4><div className={s.appBox}><strong>Oferta ilustrativa</strong><p>Dados de domínio não são carregados nesta prévia.</p></div><p className={s.appLink}>{text('availableOpportunitiesMoreLabel')}</p><div className={s.appBox}><strong>{text('availableOpportunitiesInfoTitle')}</strong><p>{text('availableOpportunitiesInfoDescription')}</p></div></>}
    {(screen==='opportunities'||screen==='investments')&&<><h4>{screen==='opportunities'?'Oportunidades':'Carteira'}</h4><div className={s.sampleField}><Search size={13}/> {text('searchPlaceholder')}</div><div className={s.appBox}><strong>Exemplo de estado vazio</strong><p>{text('emptyStateHelper')}</p></div>{screen==='opportunities'&&['detailProgressTitle','detailResourcesLabel','detailProfileLabel','detailTeamTitle'].map(key=><h5 className={s.appBox} key={key}>{text(key)}</h5>)}</>}
  </div><small className={s.appFoot}>Hierarquia editorial do Admin · acabamento representativo · sem ações ou dados operacionais</small><div className={s.phoneBar}>◂ <span>●</span> ▢</div></div>
}
