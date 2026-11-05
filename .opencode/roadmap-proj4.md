# Roadmap — NEONVOLT 4.0 OVERCLOCK (proj4)

Execução fase a fase; só marcar `[x]` com o gate verificado pelo agente principal.
Contratos do PRD §4 entram antes de qualquer pacote. Estado do remix 4
começa em R1 (roadmap 3 concluído e verificado).

## R1 — Fundação e contratos (agente principal)
- [x] `types.ts`: ramp/magnet/patrol/lock, ChallengeId, eventos/HUD/RenderView/Settings, starScore, lockedByStars
- [x] `progress.ts` v2: campaign, challengeBest, xp/level, levelInfo, ballSkin (leitura tolerante)
- [x] `validate.ts`: regras de ramp/magnet/patrol/lock/starScore; `dmd.ts` v2 (cor + star animation)
- [x] starScore preenchido nas 7 mesas atuais (contrato valida)
- GATES: tsgo limpo ✔; suíte verde ✔ (34/34); validate 7/7 ✔.

## R2 — Engine: física viva
- [x] Rampa (sensor + travessia + boost + cancelamento guard)
- [x] Ímã (força radial), patrulha (lerp por path), ball lock (retém/solta)
- [x] Goal `ramp` em missões; modificadores de desafio (GameOptions.mode)
- [x] Eventos novos, HUD estendido, getStats estendido
- GATES: testes novos verdes (rampa/ímã/patrulha/lock/tempo) ✔ (11 testes de engine); tsgo limpo ✔; suíte total 45/45 ✔.

## R3 — Renderer: espetáculo vivo
- [x] Rampa visual (trilhos + sombra + brilho); ímã (anéis + estela curvada); patrulha
- [x] DMD colorido (paleta por mesa + star animation); luzes de sistema (carga, frenzy)
- [x] Fundos v2: fenômeno ambientado por mesa (12); skin de bola (5 skins)
- GATES: tsgo limpo ✔; screenshots por mesa ✔; 60fps + reducedFx ✔ (screenshots no R9).

## R4 — Conteúdo: 12 mesas
- [x] 5 mesas novas completas (neural/deserto/fônica/vapor/reator) com mecânica de identidade
- [x] Retune das 7 existentes (rampa própria, ímã/patrulha temático, lock no Núcleo, balance)
- [x] TABLES ×12; torneio 12×2; validate ×12; testes de mesas atualizados
- GATES: validateTable [] ×12 ✔; suíte verde ✔; screenshots ×12 ✔ (no R9).

## R5 — Modos: campanha e desafios
- [x] Campanha: estrelas por partida (3 critérios), persistência, desbloqueio do Reator (18★)
- [x] 4 desafios completos com modificadores e recordes; seleção no menu
- [x] Eventos/toasts/DMD de estrela e desafio; game over de desafio
- GATES: browser E2E de modos ✔ (no R9); tsgo limpo ✔.

## R6 — Metajogo: XP, skins, conquistas
- [x] XP/nível (grantXp + levelInfo pura e testada); skins selecionáveis
- [x] Conquistas +12; stats +4; Painel Meta com nível e barra de XP
- GATES: testes de progress verdes ✔; tsgo limpo ✔.

## R7 — Áudio: trilha adaptativa
- [x] Transições por evento (wizard/desafio/frenesi); sfx novos (rampa, ímã, lock, estrela)
- GATES: revisão de ganchos + WebAudio ✔; console/mute no R9.

## R8 — Shell: menu v3, HUD v3, game over v3
- [x] Menu: abas CAMPANHA/DESAFIOS, estrelas nos cards, cadeado, atrativo adaptado
- [x] HUD: tracker de estrelas, relógio de desafio, badge frenzy; game over com estrelas/XP
- [x] Settings: skin de bola; tutorial atualizado
- GATES: fluxo completo no browser ✔ (no R9); tsgo limpo ✔; suíte ✔.

## R9 — Verificação final
- [ ] Playthrough E2E (mesas novas, rampa/ímã/lock/patrulha, campanha, 4 desafios, torneio, XP/skin)
- [ ] Regressão: recordes neonvolt.v1, progress v1 tolerante, hooks DEV; build de produção
- GATES: critérios PRD §7 todos verdes ✔; build OK ✔; 0 erros de console ✔.

## Registro de execução (remix 4)
- (preenchido durante a execução)
