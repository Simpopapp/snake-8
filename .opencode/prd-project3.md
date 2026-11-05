# PRD — NEONVOLT 3.0 "OVERDRIVE" (proj3)

> PRD derivado de `project3.md`: os projects 1 e 2 produziram ~3% do
> potencial; este projeto tem de tornar o jogo **irreconhecível** — impacto
> ~200× em cada aspecto. Este documento é a fonte do "COMO" do project3.
> O planejamento (`project3.md`) manda no QUÊ; este PRD manda no COMO;
> `roadmap-proj3.md` registra a ordem e o progresso.

---

## 1. Auditoria verificada do estado atual (base do plano)

Estudo feito arquivo a arquivo (leitura completa, não chutes). Estado por
módulo, com as fraquezas que o project3 ataca:

### 1.1 Jogo (`src/game/*`)
- **`engine.ts` (1288 linhas)**: física matter-js sólida (timestep 60Hz,
  sweep de flipper, anti-stuck 2 níveis, tilt 3/2s). Recursos do 2.0:
  skill shot (janela 3s, +2500+500·streak), ball save (480 ticks, 1/launch),
  combo (janela 150 ticks, marcos 5/10/20/35), mini-missões, multiball por
  missão, kickback 1/bola, gates-sensor (2500 pts, cooldown 48), ice ball,
  bônus de fim de bola 2500×mult, HUD 10Hz.
  **Fraquezas**: (a) só 4 tipos de elemento — sem drop targets, sem rampas
  reais, sem banca; (b) pontuação plana — não há jackpot composto, carga,
  mystery ou bola extra; (c) multiball é o único "momento" grande — não há
  modo-wizard/clímax; (d) eventos sem posição para estéreo; (e) tilt sem
  aviso prévio; (f) `hitGate` não sabe direção (decisão remix 2).
- **`renderer.ts` (641 linhas)**: fundos procedurais por mesa (grid/brasas/
  plâncton/cristais/estrelas), paredes neon 3 camadas, partículas additive,
  flash/shake/vinheta, bolas com trilha e gelo, plunger com mola.
  **Fraquezas**: (a) mesa "muda" — hit não acende a mesa (sem lightmap);
  (b) bola sem reflexo cromado; (c) sem DMD (o coração visual do pinball);
  (d) sem reflexo de vidro; (e) sem parallax/camadas animadas de fundo;
  (f) preview do menu estático (spinner não gira).
- **`frame.ts` (56 linhas)**: fonte única da geometria — sólida; estende-se
  para novos elementos de frame por mesa (sem quebrar o contrato).
- **`tables/index.ts` (350 linhas)**: 5 mesas, cada uma com paleta, 2
  defletores, 3-4 bumpers, 2-3 targets, 1 spinner, 1 kicker, 1 missão, 2
  minis. **Fraquezas**: (a) 5 mesas < promessa de diversidade; (b) mesas
  homogêneas em mecânica (todas: bumpers+spinner+kicker); (c) nenhuma usa
  drop targets; (d) só Supernova usa gates.
- **`audio.ts` (327 linhas)**: sfx sintetizados por evento + sequenciador
  musical de 8 passos por mesa. **Fraquezas**: (a) sfx mono — sem pan por
  posição; (b) música de 1 camada, constante; (c) sem sons para features
  novas (drop, mystery, wizard, bola extra, jackpot).
- **`fx.ts` (96 linhas)**: pool de partículas (máx 420), shake, flash.
  Sólido; estende-se com novos formatos de partícula.
- **`progress.ts` (225 linhas)**: stats, 14 conquistas, settings (volume,
  reducedFx), leitura tolerante. **Fraquezas**: (a) sem achievements para
  os momentos novos; (b) sem preferências novas (música, trilha).
- **`validate.ts` (87 linhas)**: valida os 5 kinds atuais + missões.
  Estende-se para `drop` e novas regras.

### 1.2 Shell/UI (`src/components/pinball/*`, rotas, estilos)
- **`GameScreen.tsx` (516 linhas)**: HUD (score, mult., objetivo, badges de
  multiball/combo/save/kickback), canvas com DPR≤2, teclado completo, touch
  por terços, auto-pause, overlays de pausa/fim com breakdown.
  **Fraquezas**: (a) sem DMD; (b) game over seco (sem contagem animada, sem
  patente); (c) sem aviso de tilt na tela; (d) sem tutorial; (e) pausa
  pobre.
- **`Menu.tsx` (230 linhas)**: 4 abas, carrossel de 5 cards, teclado.
  **Fraquezas**: (a) sem modo atrativo (arcade morto quando ninguém joga);
  (b) cards estáticos; (c) sem identidade CRT/arcade forte.
- **`Meta.tsx` (156 linhas)**: stats/conquistas/ajustes funcionais, secos.
- **`styles.css` (180 linhas)**: tokens arcade escuro + scanlines + glow.
  Base boa; falta superfície CRT completa, moldura de mesa, animações.
- **Rotas**: `/` única, boot screen, lazy mount — mantém-se.

### 1.3 Conclusão
O 2.0 é um pinball competente e verificado. O 3.0 ataca em cinco frentes,
todas simultâneas: **profundidade** (drop targets, carga voltica, mystery,
bola extra, modo-wizard, jackpot composto), **espetáculo visual** (DMD,
lightmap, bola cromada, vidro, parallax, moldura CRT), **conteúdo** (7
mesas com mecânicas distintas), **imersão sonora** (pan estéreo, música em
camadas, sfx novos) e **shell arcade** (atrativo, tutorial, game over
cinematográfico, ajustes profundos).

## 2. Visão — "NEONVOLT 3.0: OVERDRIVE"

De "pinball com recordes" para **máquina de arcade completa**: a mesa
reage a cada acerto com luz e som, um DMD grita JACKPOT/MULTIBALL/COMBO, a
carga voltica sobe a cada órbita até o jackpot, alvos que caem, mystery
que surpreende, modo-wizard que coroa a mesa, bola extra aos marcos, 7
mesas de identidades distintas, música que cresce com o jogo e um menu
vivo que se apresenta sozinho. Sem backend, 100% client-side, pt-BR,
zero regressão do que está verde.

## 3. Decisões técnicas (vinculantes)

| # | Decisão | Escolha | Por quê |
|---|---|---|---|
| D1 | Novo elemento: drop target | `kind: "drop"` (pos, w, h, angle?, score, group) — cai ao hit (corpo removido + partícula de queda), banca limpa paga 5.000 e reseta em 8s | Mecânica clássica ausente; reusa o padrão target/grupo |
| D2 | Carga voltica (volt meter) | Cada passagem de gate soma 1 carga; HUD/DMD mostram barra; ao atingir a carga máxima, o PRÓXIMO kicker paga JACKPOT (12.000 + 1.000·mult) e zera | Dá propósito às órbitas e um clímax repetível |
| D3 | Mystery | Lâmpada acende ao completar a missão assinatura; o próximo acerto no kicker entrega prêmio aleatório (5.000 pts / +1 multiplicador permanente / multiball 1 / ball save 10s) e apaga | Surpresa clássica; usa kicker como " buraco de prêmio" |
| D4 | Bola extra | Ao cruzar 60.000 e 150.000 pontos: +1 bola (evento + toast + DMD) | Recompensa perícia; padrão de arcade |
| D5 | Modo-Wizard | Completar assinatura + as 2 minis **na mesma bola** entra em WIZARD por 15s: tudo ×3, mesa inteira acesa, ball save ativo | Clímax máximo por mesa; exige maestria |
| D6 | Jackpot composto | `addScore` mantém; marcos de combo ganham faixa nova (50 → 15.000); multiball paga +50% em tudo (já existe ×2, sobe para documentar) | Extensão direta |
| D7 | Tilt com avisos | 2 avisos (DMD "AVISO n/2") antes do tilt; janela de 2s mantida | Justo e clássico |
| D8 | 2 mesas novas | `vortice-tesla` (tempestade elétrica: branco-azulado + ultravioleta, 2 gates, banca de drops) e `nucleo-zero` (núcleo de dados: verde ácido sobre preto, bomber denso, drops) | Diversidade real: 7 mesas |
| D9 | Retune das 5 mesas | Cada mesa existente ganha uma banca de drops (2–3), mystery e, onde falta, gates (Circuito/Forja/Abissal/Crio recebem 1 gate de topo com geometria própria) | Toda mesa fica tão rica quanto a Supernova |
| D10 | DMD | `src/game/dmd.ts`: matriz de pontos 128×32 desenhada em canvas próprio (pontos com blur leve), fila de mensagens prioritária + score persistente + animações (marquee, jackpot, wizard) | A peça visual mais icônica do pinball |
| D11 | Lightmap | Renderer ganha luzes dinâmicas: brilho radial da bola, flash de hit por elemento (decay), paredes pulsam com a música… com a carga voltica | Mesa viva |
| D12 | Vidro e moldura | Reflexo diagonal sutil sobre o playfield + moldura CRT com scanlines no shell (CSS), cantos arredondados, vinheta reforçada | Estética arcade premium |
| D13 | Bola cromada | Gradiente cromado com highlight móvel + rastro dinâmico por velocidade | Fidelidade física |
| D14 | Parallax de fundo | Fundos ganham 2 camadas (profundidade + detalhe animado por mesa) e reagem a nudge (desloca 4px) | Profundidade |
| D15 | Pan estéreo | `playEvent` recebe pos (quando existe) e aplica `StereoPannerNode` (x−270 → −0,7..0,7) | Imersão de fliperama |
| D16 | Música em camadas | Sequenciador ganha camada de hi-hat/percussão sempre + camada lead quando combo≥5 ou multiball; gain da lead cresce com o combo | Música acompanha o jogo |
| D17 | Atrativo no menu | Menu auto-avança a mesa selecionada a cada 6s sem interação, com "attract glow"; qualquer tecla/click cancela o ciclo | Arcade vivo |
| D18 | Tutorial | Primeira partida: overlay "COMO JOGAR" (3 passos: flippers, segurar lançador, empurrar) gravado em progress (`tutorialSeen`) | Onboarding |
| D19 | Game over cinematográfico | Contagem animada do score, patente por pontos (Aprendiz/Veterano/Mestre/Lenda/Lenda Suprema), breakdown com barras | Reconhecimento |
| D20 | Settings profundos | volume, música liga/desliga, efeitos (reduzir), trilha da bola liga/desliga, reset de progresso com confirmação | Controle real |
| D21 | Conquistas +6 | wizard-1 (primeiro wizard), mystery-1, extra-ball-1, drop-bank-5 (5 bancas), score-200k, all-missions (missão de todas as 7 mesas) | Metajogo acompanha o 3.0 |
| D22 | Stats novas | dropsBanked, mysteryHits, wizardModes, extraBalls, voltCharges | Alimenta a aba stats |
| D23 | Torneio 7 mesas | "Voltagem Total" passa a 7 mesas × 2 bolas | Conteúdo novo entra no modo |
| D24 | Contratos primeiro | types.ts + validate.ts + dmd.ts (stubs) antes da onda de subagentes | Enxame sem colisão |

Proibições mantidas: sem React Router DOM; sem backend/Cloud; matter-js só
no lazy path; cores só via TablePalette + tokens; sem emojis; `src/game/*`
nunca importa React; componentes nunca importam matter-js; `/` única rota
de conteúdo; hooks DEV (`__nvGame`, `debugPlaceBall`, `debugDrainBall`,
`debugCompleteMission`) só com `import.meta.env.DEV`.

## 4. Contratos novos (fundação — agente principal, antes da onda)

### 4.1 `src/game/types.ts`
- `TableElement` ganha:
  `{ kind: "drop"; id; pos; w; h; angle?; score; group }`.
- `TableId` ganha `"vortice-tesla" | "nucleo-zero"`.
- `GameEvent` ganha: `{ type: "dropHit"; elementId; groupId; pos }`,
  `{ type: "bankCleared"; groupId; score; pos }`,
  `{ type: "voltCharged"; charge; max }`,
  `{ type: "jackpot"; score; pos }`,
  `{ type: "mysteryAward"; award: "score" | "mult" | "ball" | "save"; score: number }`,
  `{ type: "mysteryLit" }`,
  `{ type: "wizardStarted" }`, `{ type: "wizardEnded"; score: number }`,
  `{ type: "extraBall"; total: number }`,
  `{ type: "tiltWarning"; warnings: number }`.
- `HudSnapshot` ganha: `voltCharge`, `voltMax`, `mysteryLit`,
  `wizardTicks`, `tiltWarnings`, `drops: { groupId; down; total }[]`.
- `RenderView` ganha: `dropsDown: Set<string>`, `wizardActive: boolean`,
  `voltCharge: number`, `hitFlashes: Record<string, number>` (0..1 decay).
- `Settings` ganha: `music: boolean`, `ballTrail: boolean`.

### 4.2 `src/game/dmd.ts` (novo)
- `createDmd(canvas): DmdHandle` com `show(msg, opts { color, ms, flash })`,
  `setScore(n)`, `setLine(line: string)`, `tick(t)`, `destroy()`.
- Render: pontos 128×32, cada ponto = círculo com brilho conforme
  intensidade; fontes desenhadas à mão (mapa 5×7 por glifo) — zero assets.
- Fila: mensagem prioritária interrompe a anterior; score/linha padrão
  voltam após o fim.

### 4.3 `src/game/validate.ts`
- Regras para `drop`: bounds como target; ids únicos; grupo precisa ter
  ≥1 alvo; score de mini-missão continua na faixa 3.000–7.500.

### 4.4 Motor ↔ UI
- `PinballGame.getStats()` ganha `dropsBanked`, `mysteryHits`,
  `wizardModes`, `extraBalls`, `voltCharges` (extendendo GameStatsSummary).
- `GameCallbacks.onEvent` segue porta única; GameScreen alimenta o DMD.

## 5. Escopo por fase (mapeia o roadmap)

### R1 — Fundação e contratos (agente principal)
- `types.ts` (§4.1), `dmd.ts` (§4.2, completo), `validate.ts` (§4.3),
  GameStatsSummary estendido.
- GATE: `bunx tsgo` limpo; suíte verde 24/24.

### R2 — Engine: profundidade (agente principal)
- Drops (D1), carga voltica (D2), mystery (D3), bola extra (D4), wizard
  (D5), jackpot composto (D6), avisos de tilt (D7), eventos novos com pos,
  `getStats` estendido.
- GATE: testes novos de engine verdes (drop banca, mystery, extra ball);
  browser: drop cai e banca paga; mystery entrega prêmio; wizard entra.

### R3 — Renderer: espetáculo (agente principal)
- Lightmap (D11), bola cromada (D13), vidro+moldura (D12), parallax (D14),
  drops visuais, ponteiro de carga, reflexos dos gates.
- GATE: screenshot por mesa comparada; 60fps; reducedFx respeitado.

### R4 — Conteúdo: 7 mesas (agente principal)
- D8: criar `vortice-tesla` e `nucleo-zero` completos (paleta, defletores,
  gates, bumpers, targets, drops, spinner, kicker, missão, 2 minis).
- D9: retune das 5 mesas (drops + gates onde faltam + balance).
- `TABLES` → 7; Torneio 7 mesas (D23); validate verde ×7.
- GATE: validateTable [] ×7; teste de mesas atualizado; screenshots ×7.

### R5 — Áudio: camadas e estéreo (agente principal)
- Pan estéreo (D15), música em camadas (D16), sfx dos eventos novos.
- GATE: build OK; revisão de código dos ganchos; sem erros de console.

### R6 — Shell: DMD, atrativo, game over, tutorial, ajustes (agente principal)
- DMD integrado ao GameScreen (D10), avisos de tilt, medidor de carga;
  atrativo (D17), tutorial (D18), game over cinematográfico (D19),
  settings profundos (D20), menu com moldura CRT.
- GATE: fluxo completo no browser; DMD mostra JACKPOT/COMBO/MISSÃO;
  tutorial só na 1ª partida; settings persistem.

### R7 — Metajogo: conquistas e stats (agente principal)
- Conquistas +6 (D21), stats novas (D22), Painel Meta atualizado.
- GATE: testes de progress verdes (novos unlocks); tsgo limpo.

### R8 — Verificação final (agente principal)
- Playthrough E2E completo (mesas novas, drops, mystery, wizard, torneio
  7, ajustes, tutorial, atrativo); regressão total (recordes, testes
  antigos, DEV hooks); build de produção.
- GATE: critérios de aceite §7 todos verdes.

## 6. Especificações de detalhe

### 6.1 Drop targets
- Corpo: retângulo estático (w×2 × h×2) com ângulo; hit → partículas
  verticais de queda, corpo removido, `dropsDown` registra; score padrão
  750. Banca: quando o grupo todo está down → +5.000, evento
  `bankCleared`, reset em 8s (TARGET_RESET_TICKS×1,5).
- Visual: placa com face frontal brilhante; caída = recorte escuro +
  faixa fina no fundo do poço.
- Mesas: 3 drops por mesa nova; 2–3 nas existentes (grupos prefixados).

### 6.2 Carga voltica
- `voltCharge` (0..voltMax=5) por bola; gate → +1 (evento
  `voltCharged`); DMD mostra barra; quando charge==max, lâmpada "JACKPOT
  PRONTO" no kicker (anel pulsante); kicker com carga cheia: paga
  12.000 + 1.000×mult, zera carga, DMD "JACKPOT!". Reset ao drenar.
- Integração: `hitGate` soma; `enterKicker` cobra o jackpot se cheio
  (antes do score normal).

### 6.3 Mystery
- `mysteryLit` ao completar a missão assinatura (em paralelo à recompensa).
- Kicker hit com lâmpada acesa: prêmio uniformemente aleatório:
  1) +5.000 pts; 2) multiplicador permanente +1 (máx ×8; flag própria,
  soma ao mult por streak no fim de bola? — não: mult permanente vivo até
  o fim da partida, aplicado no addScore); 3) multiball +1 (se houver
  room); 4) ball save 10s. DMD anuncia ("MYSTERY: ×2!").
- Zera a lâmpada; reacende na próxima missão.

### 6.4 Bola extra
- Marcos: 60.000 e 150.000 (checados no addScore); `ballsRemaining++`,
  evento + DMD "BOLA EXTRA". Sem limite de bolas totais além dos marcos.

### 6.5 Modo-Wizard
- Condição: assinatura + as 2 minis concluídas na MESMA bola (rastrear
  `missionDoneThisBall`, `minisDoneThisBall: Set`).
- Entra: 15s (900 ticks) — mult ×3 (multiplica o addScore além do normal),
  `wizardActive` no RenderView (mesa acesa: paredes e fundo intensificados),
  ball save contínuo durante o modo (dreno re-serva).
- Fim: evento com total somado no modo; DMD "WIZARD! +N".

### 6.6 DMD — mensagens
- Prioridade: WIZARD > JACKPOT > MULTI-BALL > MYSTERY > BOLA EXTRA >
  MISSÃO > COMBO ≥10 > skill shot > bancas > padrão (score + linha da
  mesa). Durações 1,2–2,5s. Animações: texto deslizante, piscada, contagem.
- Intensidade de pontos: 2 níveis (aceso/apagado) + meio-brilho na borda.

### 6.7 Atrativo
- Menu: timer 6s troca `selected` (0→6→0); glow pulsante no card ativo;
  qualquer input para o timer por 30s. Botão "DEMO"? Não — só o ciclo.

### 6.8 Game over
- Patentes: <20k APRENDIZ; <60k VETERANO; <120k MESTRE; <250k LENDA;
  ≥250k LENDA SUPREMA. Contagem animada (ease-out 1,2s), barras de
  breakdown, toasts de conquista mantidos.

### 6.9 Mesas novas — identidade
- **Vórtice Tesla** (`vortice-tesla`): bg azul-noite profundo, bobinas
  (bumpers glowA branco-elétrico #e0f2fe, glowB ultravioleta #818cf8),
  2 gates em arco (relâmpagos), banca de 3 drops "células", spinner
  "rotor", kicker "capacitor"; missão "Descarga de Tesla" (hits na bobina
  central ×6 → multiball 2); minis: "Tempestade" (spinnerHold 3,5s),
  "Blindagem" (grupo de drops).
- **Núcleo Zero** (`nucleo-zero`): bg preto absoluto, verde ácido (#4ade80)
  + branco frio; bumper denso central "núcleo" (r 40, score 400), 4
  bumpers satélite, 2 gates diagonais, drops "firewall" ×3, kicker
  "porta de saída"; missão "Root Access" (grupo firewall → jackpot 15.000);
  minis: "Byte Rate" (spinnerHold 3s), "Overflow" (12 hits no núcleo).
- Ambas: gravity 1,0, ballRadius 7, restitution 0,82/0,85, maxBalls 3.

### 6.10 Retune das 5 mesas
- Cada uma ganha: 1 banca de drops (grupo temático: neon "diodos", forja
  "bigornas", abyss "conchas", cryo "geleiras", supernova "fragmentos"),
  mystery (§6.3), e gate de topo nas 4 sem (arco superior próprio,
  geometria y<160, não conflita com elementos).
- Balance: scores de drops 750; bumpers +10–20% nos valores baixos;
  kickers mantêm.

## 7. Critérios de aceite (produto final)

1. Abrir `/`: menu com 7 mesas, moldura CRT, atrativo ativo; zero erros de
   console; teclado navega.
2. Jogar Circuito Neon: drop cai com partícula e banca de 3 paga 5.000 e
   reseta; gate de topo soma carga (DMD/HUD); carga cheia + kicker =
   JACKPOT com DMD; mystery entrega prêmio variado.
3. Bola extra dispara em 60k (debug hook ou jogo natural); toast + DMD.
4. Wizard: assinatura + 2 minis na mesma bola → 15s ×3 com mesa acesa e
   ball save; DMD anuncia entrada e saída com total.
5. DMD: mostra score persistente e mensagens priorizadas (JACKPOT >
   MULTIBALL > MYSTERY > ...); animação de marquee nas transições.
6. 7 mesas validam ([]); torneio percorre 7×2 bolas com total cumulativo.
7. Som: hits panam conforme posição (revisão + inspeção do grafo WebAudio);
   música ganha camada com combo≥5/multiball; mute zera tudo.
8. Game over: contagem animada + patente correta para a faixa de pontos.
9. Tutorial aparece só na 1ª partida (persistência verificada com reload).
10. Conquistas: 6 novas desbloqueiam nos gatilhos certos e aparecem na aba.
11. Regressão: recordes `neonvolt.v1` preservados; testes existentes
    intocados e verdes; hooks DEV presentes.
12. Build de produção sem erros; sem import estático de matter-js em SSR;
    60fps visuais com reducedFx respeitado.

## 8. Riscos e mitigações

- **Escopo gigante numa passada**: contratos primeiro (R1), fases
  independentes depois; cada fase com gate próprio — nada avança quebrado.
- **DMD perf**: 128×32 = 4.096 pontos/frame — desenhar só pontos acesos,
  cache de glifos em offscreen canvas.
- **Lightmap perf**: luzes são gradientes radiais baratos; reducedFx corta
  camadas (sem parallax extra, menos partículas).
- **Engine cresce além de 1.400 linhas**: extrair helpers? Não nesta
  passada — arquivo único já provado; manter padrão de guards.
- **noUncheckedIndexedAccess**: guards `?? default` em todo acesso.
- **Torneio 7×2 = 14 bolas**: transições já provadas por remontagem.
- **Mystery random determinístico em teste**: seed por `tick` — testes
  fixam tick via debug hooks.

## 9. Fora de escopo

Multiplayer, backend/contas, cloud saves, editor de mesas, i18n além de
pt-BR, rotas novas além de `/`, física de magnetos reais, video mode.

## 10. Registro de decisões da execução (remix 3)

1. **Enxame**: `spawn_agent` é read-only neste ambiente; 3 auditores
   paralelos produziram os relatórios que fundamentaram a §1; produção de
   código 100% do agente principal.
2. **Drops reusam a infra de targets** (corpo removido + grupo + reset) —
   diferença é o visual de queda e o bônus de banca; sem física nova.
3. **Mystery via kicker** evita novo tipo de sensor; prêmio de
   multiplicador é permanente na partida (mais emocionante que temporário).
4. **Wizard por bola** (não por partida): mais alcançável e re-armável.
5. **DMD em canvas próprio** no topo do GameScreen — não dentro do
   playfield; espaçamento vertical preservado com layout flex.
6. **Torneio mantém recorde próprio**; `recordTournament` intocado.
