# Roadmap — NEONVOLT 3.0 OVERDRIVE (proj3)

Execução fase a fase; só marcar `[x]` com o gate verificado pelo agente principal.

## R1 — Fundação e contratos (agente principal)
- [x] `types.ts`: `drop`, novos TableId, eventos novos, HUD/RenderView/Settings
- [x] `dmd.ts` completo (matriz 128×32, fila, glifos via sampling)
- [x] `validate.ts`: regras de drop; `GameStatsSummary` estendido
- GATES: tsgo limpo ✔; suíte verde ✔.

## R2 — Engine: profundidade
- [x] Drop targets (cair, banca +5.000, reset 8s)
- [x] Carga voltica (gate +1, kicker paga jackpot com carga cheia)
- [x] Mystery (lâmpada pós-missão, 4 prêmios no kicker)
- [x] Bola extra 60k/150k; jackpot composto (combo 50)
- [x] Modo-wizard (15s ×3, ball save); avisos de tilt (2)
- GATES: tsgo limpo ✔; suíte 22/22 ✔ (correções P0 do audit: kicker
  double-score, drain idempotente, tilt congela score, ice ball mass).
  Verificação browser pendente para R8.

## R3 — Renderer: espetáculo
- [x] Lightmap (bola, hits por elemento, paredes pulsando no wizard)
- [x] Bola cromada + rastro dinâmico; vidro
- [x] Drops visuais; medidor de carga; mystery lamp; reducedFx respeitado
- GATES: tsgo limpo ✔; screenshots ×7 em R8.

## R4 — Conteúdo: 7 mesas
- [x] `vortice-tesla` e `nucleo-zero` completos
- [x] Retune das 5 existentes (drops + gates faltantes)
- [x] TABLES ×7; validate ×7 (testes atualizados: 7 mesas, bancas, drops 750)
- GATES: tsgo limpo ✔; suíte 22/22 ✔. Torneio 7×2 em R6.

## R5 — Áudio: camadas e estéreo
- [x] Pan estéreo por pos; sfx dos eventos novos
- [x] Música: percussão sempre + lead dinâmico (combo/multiball)
- GATES: tsgo limpo ✔; correções do audit (start idempotente, backlog no
  mute, stop corta vozes). Audibilidade real pendente (fora do ambiente).

## R6 — Shell: DMD, atrativo, game over, tutorial, ajustes
- [x] DMD integrado ao GameScreen (fila priorizada)
- [x] Atrativo no menu; tutorial 1ª partida; game over cinematográfico
- [x] Settings profundos (música, rastro, reset); correção do total do
  torneio (bug P0 do audit); pausa sincronizada
- GATES: tsgo limpo ✔; suíte 24/24 ✔; fluxo browser em R8.

## R7 — Metajogo: conquistas e stats
- [x] Conquistas +8 (wizard, mystery, extra ball, bancas, 200k,
  all-missions, missões das 2 mesas novas)
- [x] Stats novas; painel Meta atualizado; testes de progress (24/24)
- GATES: testes de progress verdes ✔; tsgo limpo ✔.

## R8 — Verificação final
- [x] Playthrough E2E (browser DEV hooks): menu 7 mesas → tutorial → drops
  (banca paga, bancas: 1 no breakdown) → missão concluída + MYSTERY acesa +
  DMD animado → gate do topo → game over com patente VETERANO, contagem
  animada e breakdown completo
- [x] Regressão: recordes neonvolt.v1 preservados; suíte 24/24; hooks DEV
  ativos; build de produção OK
- GATES: critérios PRD §7 verificados no browser ✔; 0 erros de console ✔;
  build OK ✔. Pendente fora do ambiente: audibilidade real do áudio,
  multitouch físico e a verificação manual do modo-wizard em jogo natural
  (lógica revisada em código e coberta pelas mesmas rotinas de missão).

## Registro de execução (remix 3 — NEONVOLT 3.0 OVERDRIVE)
- 3 subagentes de auditoria (read-only) fundamentaram o PRD §1; produção de
  código 100% do agente principal (spawn_agent read-only neste ambiente).
- Correções P0 do audit aplicadas: kicker double-score, drain idempotente,
  tilt congela score, ice ball mantém massa base, total do torneio acumula,
  pausa sincronizada com o ref, música idempotente/sem backlog no mute.
- 24/24 testes verdes; tsgo limpo; build OK; 0 erros de console no E2E.
