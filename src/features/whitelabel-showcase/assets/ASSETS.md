# Assets da Vitrine de White Labels (protótipo mock)

Cópias **byte a byte** dos arquivos aprovados em `devLoor1/FRONT-WEB/src/assets/mock-whitelabels/` (branch `mock`, HEAD local `8a927d5` com refinamentos não commitados preservados), copiadas em 06/11/2026 para o worktree `feature/mock-whitelabel-showcase-config-v1` do Super Admin. Nenhuma conversão, recorte, compressão ou imagem nova. Os originais e sua procedência permanecem em `FRONT-WEB/src/assets/mock-whitelabels/ASSETS.md`, que não foi alterado.

Uso: demonstração offline da vitrine configurável. CONECTA e IMPULSO são identidades ilustrativas, não slugs ou clientes reais. As fotografias não são assets de produção.

`scripts/check-mock-showcase.mjs` confere estes hashes SHA-256.

| Arquivo | SHA-256 | Papel |
| --- | --- | --- |
| `hero-team.png` | 6159c56d57ffb5eec063476845a09cf4fa10f8e220138c748356ba1149eebb95 | Banner semeado (1586 × 992) |
| `hero-collaboration.png` | 1e63fb1f11ba0fe70b4b71169c1ffa54d3615bddf435bce0e41b25dd408e9a7d | Banner semeado (1586 × 992) |
| `cards/conecta-square.webp` | 9910638eb378eee46568dbd247ca84d91958b2f219a65c13173bbdb6d3779048 | Foto de card semeada (1440 × 720) |
| `cards/conecta-community.webp` | 2ae68811859ff8656429f5a86c4fa7d4bbd9269581a4c9e541c56f652fab24fd | Foto de card semeada (1440 × 720) |
| `cards/conecta-platform.webp` | d75d7abc2c78cf0c28a195e4268240c71cba66f339bb04c6fd46f9797fbb31ef | Foto de card semeada (1440 × 901) |
| `cards/impulso-region.webp` | 9be990abab6624da58f2063d624fc1faf970f63137f8c72e2f14856a84d7c2b5 | Foto de card semeada (1440 × 720) |
| `cards/impulso-town.webp` | 3dc94f3eb4d765f0bb33c3370cd0e49a8832c897f6948306670cc4a6bb47110c | Foto de card semeada (1440 × 720) |
| `cards/impulso-collaboration.webp` | 14a1479d013fdcf8edfb16dd5279000c93aca0f0ed0ec8cf819e80edc45319da | Foto de card semeada (1440 × 720) |
| `conecta-logo.png` | 1fff6234796b0d4a4a4e9d500e3501462e5aacf61248656e79cf00f6a92cef1c | Logotipo ilustrativo, PNG transparente 2172 × 724; impulso-logo também representa o logo canônico **simulado** da origem nova-plataforma-demo |
| `impulso-logo.png` | 338385b200c51fa0e2704922ad2368b5fd7ac10261496d15050e335dc1646a41 | Logotipo ilustrativo, PNG transparente 2172 × 724; impulso-logo também representa o logo canônico **simulado** da origem nova-plataforma-demo |
| `loor-logo.png` | c2f59575d013103a8cdbd64c06f1c374ee95e72a88229db8b7a96bcea8af8421 | Header da vitrine |
| `cvm-notice.png` | 1d0ca0bb928b9bcda7313260cb608f3f3e8dc4064674e06e2f060eed6e8ef4af | Faixa regulatória do footer |
| `fonts/inter-latin-variable.woff2` | 3100e775e8616cd2611beecfa23a4263d7037586789b43f035236a2e6fbd4c62 | Fonte variável latina (Google Fonts) |
| `fonts/montserrat-latin-variable.woff2` | 06b16db7a969135d48d38c49183be7fb88d4452e2a3011957c7851941f4e4879 | Fonte variável latina (Google Fonts) |
| `fonts/inter-OFL.txt` | 5dd548d31a85f756e01d63e00d7faf1e324103ed3e9102fcbbabf2cc2db6dd39 | Licença SIL OFL da fonte |
| `fonts/montserrat-OFL.txt` | 861d64229728cd65a98d119612c12769582574d1a092f0b63c8b0fd474e7065f | Licença SIL OFL da fonte |
| `fonts/sources.json` | 04e155840d8536d1e839bdf50305113a7d1e88dd14eff169d565803ff095e91b | URLs de origem das fontes |

Ícones: os componentes usam `lucide-react` (dependência existente). Os três glifos sociais do footer (Instagram, LinkedIn, YouTube) reproduzem os contornos Feather (licença MIT) usados pela vitrine aprovada via `react-icons/fi`, porque o `lucide-react` 1.x instalado não inclui ícones de marca.

## Reutilização de logos identificadas — complemento 11/11/2026

O seletor operacional oferece um catálogo limitado de arquivos reais identificados, além de refs já vinculadas como logos no documento WL6. Não é catálogo global de branding, nem infere logo institucional de imagem de login/e-mail/PWA.

- `loor-logo.png`: versão escura do site LOØR; 236×64 RGBA, 2.896 bytes, SHA256 `c2f59575d013103a8cdbd64c06f1c374ee95e72a88229db8b7a96bcea8af8421`. Cópia já presente no SA, idêntica à fonte `loor-capital-suite/artifacts/loor/src/assets/loor-logo.png`, usada por `config/brand.ts`/`AppLogo`.
- `loor-logo-white-solid.png`: variante clara existente, aceita pelo usuário na vitrine WL6/revisão7; 1152×576 RGBA, 224.502 bytes, SHA256 `b27dedf3aea07f367fac6f8616043118778b313364d1b696bc2474cf0a8d2957`. Cópia binária do arquivo de mesmo nome em `loor-capital-suite/artifacts/loor/src/assets/`, fonte atual d35507d; origem histórica commit297e808. Não é a variante `white-official` e não se apresenta como aprovação institucional geral.

As fontes originais foram preservadas. As opções de arquivo são servidas pelo próprio SA e copiadas para um novo assetRef WL6/slotshowcase apenas após seleção explícita. Refs elegíveis já vinculadas à vitrine são reutilizadas sem upload; outras instâncias e originais não são alterados. Nenhuma variante CONECTA/IMPULSO entra neste catálogo operacional.
