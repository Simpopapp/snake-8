# PRD — NEONVOLT 4.0 "OVERCLOCK" (proj4)

> PRD derivado de `project4.md`: o project3 decepcionou; este projeto tem de
> ser **10× maior em impacto** — sem delimitação "de A a B": a ordem é ir de
> **A a Z**. Este documento é a fonte do "COMO" do project4. O planejamento
> (`project4.md`) manda no QUÊ; este PRD manda no COMO;
> `roadmap-proj4.md` registra a ordem e o progresso.

---

## 1. Auditoria verificada do estado atual (base 3.0, lida arquivo a arquivo)

O 3.0 "OVERDRIVE" está concluído e verificado (roadmap 3 todo verde, 24/24
testes, E2E em browser). Estado real por módulo:

### 1.1 Jogo (`src/game/*`)
- **`engine.ts` (1.575 linhas)**: física matter-js 60Hz fixo; skill shot,
  ball save, combo com marcos (50→15.000), mini-missões, multiball, kickback,
  gates-sensor, ice ball, drop targets com banca (+5.000, reset 8s), carga
  voltica (5 cargas → jackpot no kicker), mystery (4 prêmios), bola extra
  (60k/150k), modo-wizard (15s ×3 + ball save), tilt com 2 avisos,
  anti-stuck 2 níveis, bônus de fim de bola.
  **Fraquezas do 3.0**: (a) os elementos continuam ESTÁTICOS — nada na mesa
  se move por si; (b) gates são sensores de passagem sem recompensa de
  trajeto — não existem RAMPAS (a bola nunca "viaja" numa órbita elevada);
  (c) não há campo de força/imã — a trajetória é sempre previsível;
  (d) o multiball é sempre instantâneo — não há ESCADA de multiball
  (ball lock) que dê ritmo à mesa; (e) o "modo" da partida é único — não há
  regras alternativas (tempo, 1 bola, caos) nem multiplicadores de risco.
- **`renderer.ts` (841 linhas)**: fundos procedurais por mesa, lightmap,
  bola cromada com rastro, vidro, parallax leve, drops, medidor de carga,
  reducedFx respeitado. **Fraquezas**: (a) fundo ainda é 1 camada "plana" —
  sem fenômeno ambientado por mesa (tempestade, neve, bioluminescência);
  (b) rampas inexistentes; (c) DMD monocromático âmbar; (d) luzes reagem a
  hits mas não a ESTADOS de sistema (carga, magnetismo, campanha).
- **`tables/index.ts` (500 linhas)**: 7 mesas, todas com o MESMO esqueleto
  mecânico (bumpers + targets + 1 drop bank pequena + spinner + kicker +
  1-2 gates). Identidade é visual, não mecânica. Nenhuma mesa exige um
  "plano de mesa" próprio.
- **`dmd.ts` (189 linhas)**: matriz 128×32, fila prioritária, score
  persistente, glifos 5×7. Sólido; estende-se com cor e animações novas.
- **`audio.ts` (474 linhas)**: sfx com pan estéreo, música em camadas
  (percussão + lead dinâmico) por mesa. **Fraquezas**: (a) camadas são
  binárias (liga/desliga) — não há transição musical de modo (wizard,
  desafio, campanha); (b) sem sfx para rampa/imã/lock/estrela.
- **`progress.ts` (295 linhas)**: stats, 22 conquistas, settings
  (volume, reducedFx, music, ballTrail, tutorialSeen), leitura tolerante,
  esquema aditivo. **Fraquezas**: (a) sem progressão LONGO PRAZO (XP/nível)
  — o metajogo é uma lista plana de conquistas; (b) sem objetivo persistente
  entre partidas (estrelas por mesa); (c) sem recordes de modos alternativos.
- **`fx.ts` (96 linhas)**: pool de partículas, shake, flash. Estende-se.
- **`validate.ts` (91 linhas)**: valida 6 kinds + missões. Estende-se.

### 1.2 Shell/UI (`src/components/pinball/*`)
- **`GameScreen.tsx` (738 linhas)**: HUD completo, DMD integrado, overlays
  de pausa/fim com breakdown, tutorial, atrativo, settings profundos.
  **Fraquezas**: (a) HUD não mostra estrelas/objetivos de campanha nem o
  relógio de desafio; (b) game over não reconhece modos alternativos;
  (c) DMD sem cor de mesa.
- **`Menu.tsx` (253 linhas)**: 4 abas, grid de cards, atrativo, teclado.
  **Fraquezas**: (a) sem campanha visível (a estrutura de progresso do jogo
  é invisível); (b) sem modos alternativos acessíveis; (c) cartões sem
  estado de estrelas.
- **`Meta.tsx` (218 linhas)**: stats/conquistas/ajustes funcionais.
- **`PinballApp.tsx` (133 linhas)**: roteamento menu↔jogo↔torneio; estende-se
  para campanha e desafios.

### 1.3 Conclusão
O 3.0 é uma máquina de arcade completa **estática**. O 4.0 ataca em sete
frentes simultâneas: **física viva** (rampas, ímãs, elementos móveis, ball
lock), **conteúdo** (12 mesas com mecânicas de identidade própria), **modos**
(campanha com estrelas, 4 desafios, torneio 12), **metajogo de progressão**
(XP, nível, skins de bola, +12 conquistas), **espetáculo** (fundos vivos,
DMD colorido, luzes de sistema), **trilha adaptativa** (transições de modo) e
**shell de fliperama** (menu v3, HUD v3, game over v3).

## 2. Visão — "NEONVOLT 4.0: OVERCLOCK"

De "máquina de arcade completa" para **fliperama que você não termina**:
a mesa tem rampas que a bola percorre de verdade, ímãs que dobram a bola,
alvos que patrulham, um lock que cria expectativa antes do multiball; o
jogador tem uma CAMPANHA com estrelas por mesa que desbloqueia a mesa-final
"Reator", quatro DESAFIOS com recordes próprios, XP e nível que destravam
skins de bola, 12 mesas onde cada uma joga diferente — e o menu se apresenta
como a vitrine de um fliperama de verdade. 100% client-side, pt-BR, zero
regressão do que está verde.

## 3. Decisões técnicas (vinculantes)

| # | Decisão | Escolha | Por quê |
|---|---|---|---|
| D1 | Novo elemento: **rampa** | `{ kind: "ramp"; id; path: Vec2[]; width; score; boost: number }` — sensor de trajeto: a bola que entra em `path[0]` (ou cruza o primeiro segmento) é guiada ao longo do path com velocidade preservada + boost no final | O "tiro de rampa" é a mecânica clássica ausente; transforma gates decorativos em alvos de perícia |
| D2 | Novo elemento: **ímã** | `{ kind: "magnet"; id; pos; radius; strength; score }` — campo que curva a trajetória dentro do raio (força radial `strength`), com pulso visual | Dobra a trajetória: mesas ganham "armadilhas doces" e controle fino |
| D3 | Elemento móvel: **patrulha** | `bumper`/`drop` ganham `patrol?: { path: Vec2[]; speed: number }` — o corpo percorre o path em loop (lerp por ticks) | Mesas deixam de ser estáticas; alvos móveis = timing |
| D4 | **Ball lock** | `kicker` ganha `lock?: boolean` — com lock, o kicker RETÉM a bola (sem eject automático); ao reter, evento `lockStaged`; o multiball da missão/libera solta as bolas presas | Escada clássica de multiball: a mesa "guarda" a bola para o momento grande |
| D5 | Novo goal de missão | `MissionKind` ganha `{ type: "ramp"; rampId: string; count: number }` | Missões de rampa; reusa a infra de contagem |
| D6 | **5 mesas novas → 12** | `orquestra-neural`, `deserto-estatico`, `catedral-fonica`, `cidade-vapor`, `reator-final` (a última trancada por estrelas) | Diversidade mecânica real: cada mesa nova obriga 1 mecânica nova |
| D7 | Retune das 7 existentes | Cada mesa ganha ≥1 rampa; ímãs onde temático; patrulha onde temático; `starScore` definido | Nenhuma mesa fica para trás do padrão 4.0 |
| D8 | **Campanha** | Por mesa, 3 estrelas: ① missão assinatura concluída; ② score ≥ `starScore`; ③ modo-wizard na partida. Persistidas em progress; "Reator Final" desbloqueia com ≥18 estrelas | Objetivo longo prazo com estado visível; usa stats que JÁ existem |
| D9 | **4 desafios** | `tempo` (120s, 1 bola, ball save 3s), `umabola` (1 bola, sem save, sem bola extra), `caos` (3 bolas de uma vez, sem save), `frenesi` (score ×2, dreno acelera 20%, combo janela −30%). Modificadores são GameOptions do engine; recordes por desafio | Regras alternativas com custo baixo e rejogabilidade alta |
| D10 | Torneio 12 mesas | "Voltagem Total" → 12 mesas × 2 bolas, total cumulativo | Conteúdo novo entra no modo |
| D11 | **XP e nível** | `xp = floor(score/100)` por partida (desafios ×0,5); nível por curva cumulativa `needed(n) = 2000 + (n−1)·1500`; nível destrava skins de bola (nv2: Plasma L2, Ouro L4, Holográfica L6, Vórtice L8) | Progressão perceptível sem backend |
| D12 | Skin de bola | `Settings.ballSkin: "cromada" \| "plasma" \| "ouro" \| "holo" \| "vortice"` — o renderer troca o gradiente/estela da bola | Recompensa visível em toda bola |
| D13 | Conquistas +12 | ramp-10, magnet-50, lock-1, stars-15, stars-36, reator-mission, challenge-1, tempo-50k, frenesi-100k, level-5, level-10, tables-12 | Metajogo acompanha o 4.0 |
| D14 | Stats +4 | `rampRuns`, `magnetHits`, `locksStaged`, `challengesPlayed` | Alimenta a aba de stats |
| D15 | Fundos vivos | Cada mesa ganha "fenômeno ambientado" em 2 camadas animadas (ex.: neural = sinapses pulsando; deserto = areia à deriva; fônica = anéis de onda; vapor = vapor ascendente; reator = alarme cardíaco) | Fundo deixa de ser textura e vira clima |
| D16 | DMD colorido | `show(msg, { color })` aceita paleta da mesa (wall/glowA/hot); modo-campanha mostra "ESTRELA +" | O coração visual do fliperama ganha identidade |
| D17 | Música adaptativa | `startMusic` ganha transição de intensidade por EVENTO (wizard sobe camada arp, desafio tempo acelera BPM 10%, frenesi distorce lead); sfx novos: rampa, ímã, lock, estrela | A trilha acompanha o estado do jogo |
| D18 | Menu v3 | Abas novas: CAMPANHA (grade 12 mesas com estrelas, progresso de desbloqueio) e DESAFIOS (4 cartões com recorde); card da mesa mostra estrelas ganhas | A estrutura do jogo vira vitrine |
| D19 | HUD v3 | HUD mostra tracker de estrelas da mesa (3 ícones) e, em desafios, o relógio/estado do modo; game over mostra estrelas ganhas na partida | O objetivo está sempre na cara do jogador |
| D20 | Contratos primeiro | `types.ts` + `validate.ts` + progress v2 antes de qualquer produção paralela | Enxame sem colisão |
| D21 | Perf budget | Ímã: O(bolas) por tick; patrulha: lerp de 2 pontos; rampa: sem física nova (sensor + reparametrização); 60fps com reducedFx respeitado | Engine não pode regredir |
| D22 | Desafio no engine | `GameOptions { mode?: { kind: "challenge"; id: ChallengeId } }` — engine aplica modificadores (tempo, bolas iniciais, mult de score, dreno) internamente; UI só informa | Regra de negócio no engine, UI burra |
| D23 | Reator trancada | `TableDef.lockedByStars?: number` — menu bloqueia a mesa e mostra o cadeado; engine não impede (defesa é de UI) | Desbloqueio por progresso |

Proibições mantidas: sem React Router DOM; sem backend/Cloud; matter-js só
no lazy path; cores só via TablePalette + tokens; sem emojis; `src/game/*`
nunca importa React; componentes nunca importam matter-js; `/` única rota
de conteúdo; hooks DEV (`__nvGame`, `debugPlaceBall`, `debugDrainBall`,
`debugCompleteMission`) só com `import.meta.env.DEV`; chaves `neonvolt.v1`
e `neonvolt.progress.v1` nunca migradas nem mescladas (leitura tolerante,
esquema aditivo).

## 4. Contratos novos (fundação — agente principal, antes de qualquer onda)

### 4.1 `src/game/types.ts`
- `TableElement` ganha:
  - `{ kind: "ramp"; id; path: Vec2[]; width: number; score: number; boost: number }`
    (path com ≥3 pontos; width 18–30; boost 1.1–1.6).
  - `{ kind: "magnet"; id; pos; radius: number; strength: number; score: number }`
    (radius 40–80; strength 0.02–0.12 por tick).
  - `bumper` e `drop` ganham `patrol?: { path: Vec2[]; speed: number }`
    (speed em px/tick, 0.4–1.2).
  - `kicker` ganha `lock?: boolean`.
- `TableId` ganha `"orquestra-neural" | "deserto-estatico" | "catedral-fonica" | "cidade-vapor" | "reator-final"`.
- `TableDef` ganha `starScore: number` (limite da estrela ②) e
  `lockedByStars?: number`.
- `MissionKind` ganha `{ type: "ramp"; rampId: string; count: number }`.
- `ChallengeId = "tempo" | "umabola" | "caos" | "frenesi"`.
- `GameEvent` ganha:
  `{ type: "rampRun"; elementId: string; score: number; pos: Vec2 }`,
  `{ type: "magnetPulled"; elementId: string; pos: Vec2 }`,
  `{ type: "lockStaged"; total: number; pos: Vec2 }`,
  `{ type: "lockReleased"; balls: number }`,
  `{ type: "starEarned"; tableId: TableId; index: 1 | 2 | 3 }`,
  `{ type: "challengeEnded"; id: ChallengeId; score: number; timeout: boolean }`,
  `{ type: "frenzyActive"; on: boolean }`.
- `HudSnapshot` ganha: `lockedBalls: number`, `challengeSecondsLeft: number | null`,
  `challengeId: ChallengeId | null`, `frenzy: boolean`, `stars: [boolean, boolean, boolean]` (estado da mesa atual).
- `RenderView` ganha: `rampHeat: Record<string, number>`, `magnetPulse: Record<string, number>`,
  `patrolPhase: Record<string, number>` (0..1 no path), `lockedBalls: number`, `frenzy: boolean`.
- `Settings` ganha `ballSkin: BallSkin`.
- `GameOptions` ganha `mode?: { kind: "challenge"; id: ChallengeId }`.

### 4.2 `src/game/progress.ts` (v2 — esquema aditivo)
- `CampaignProgress = Partial<Record<TableId, [boolean, boolean, boolean]>>`.
- `ChallengeBest = Partial<Record<ChallengeId, number>>`.
- `Progress` ganha `campaign: CampaignProgress`, `challengeBest: ChallengeBest`,
  `xp: number`, `level: number` (derivada, salva para leitura tolerante).
- `recordChallenge(id, score)`, `grantXp(score)`, `levelInfo(xp)` (puras,
  testáveis), `totalStars()`.
- `Settings` ganha `ballSkin` (default `"cromada"`).
- Leitura tolerante: progress v1 sem os campos novos carrega com defaults.

### 4.3 `src/game/validate.ts`
- `ramp`: path ≥3 pontos, todos em x∈(16,486), y∈(60,860), sem cruzar a lane
  (x>486); width 18–30; boost 1.05–1.6; score ≥ 200.
- `magnet`: pos em bounds de elemento; radius 40–80; strength 0.02–0.12;
  score ≥ 0.
- `patrol`: path ≥2 pontos; speed 0.4–1.2.
- `kicker.lock`: se true, a mesa precisa ter `maxBalls ≥ 2`.
- `TableDef.starScore`: inteiro ≥ 10.000.
- `lockedByStars`: inteiro ≥ 1 (apenas `reator-final`).

### 4.4 DMD v2 (`src/game/dmd.ts`)
- `DmdShowOptions` ganha `color?: "amber" | "wall" | "glowA" | "glowB" | "hot"`.
- `DmdHandle` ganha `setColor(palette: { wall; glowA; glowB; hot })`.
- Animações novas: `scroll` (texto correndo) e `blink` já existem; adicionar
  `star` (raio aceso varrendo a borda) para campanha.

### 4.5 Motor ↔ UI
- `GameStatsSummary` ganha `rampRuns`, `magnetHits`, `locksStaged`.
- `PinballGame` aceita `GameOptions.mode` e reporta `challengeSecondsLeft` no HUD.
- `GameCallbacks.onEvent` segue porta única; GameScreen/PinballApp consomem
  os eventos novos (estrela → toast + DMD; challengeEnded → overlay próprio).

## 5. Escopo por fase (mapeia o roadmap)

### R1 — Fundação e contratos (agente principal)
- `types.ts` (§4.1), `progress.ts` v2 (§4.2), `validate.ts` (§4.3),
  `dmd.ts` v2 (§4.4), `GameStatsSummary` estendido, testes de contratos.
- GATE: `bunx tsgo` limpo; suíte verde; mesas atuais passam no validate
  estendido (starScore preenchido nas 7).

### R2 — Engine: física viva (agente principal)
- Rampa (D1), ímã (D2), patrulha (D3), ball lock (D4), goal `ramp` (D5),
  modificadores de desafio (D22), eventos novos, HUD estendido,
  `getStats` estendido, XP/campanha alimentados pelos stats.
- GATE: testes novos verdes (rampa completa e pontua, ímã curva a bola,
  patrulha se move, lock retém e solta no multiball, desafio tempo encerra
  aos 120s); tsgo limpo; suíte total verde.

### R3 — Renderer: espetáculo vivo (agente principal)
- Rampa visual (faixa elevada com sombra e trilhos), campo de ímã (anéis
  pulsantes + distorção da estela da bola dentro do raio), patrulha
  (corpo em movimento com estica de trilha), DMD colorido (§4.4),
  fundos v2 — fenômeno ambientado por mesa (D15) em 2 camadas,
  luzes de sistema (carga cheia, frenzy aceso), skin de bola (D12).
- GATE: screenshot por mesa comparada; 60fps; reducedFx respeitado;
  tsgo limpo.

### R4 — Conteúdo: 12 mesas (agente principal)
- D6: criar as 5 mesas novas completas (§6.2: paleta, defletores, rampas,
  ímãs, patrulhas, bumpers, targets, drops, spinner, kicker/lock, missão,
  2 minis, starScore).
- D7: retune das 7 existentes (rampa própria, ímã/patrulha temático,
  starScore, balance).
- `TABLES` ×12; validate ×12; torneio 12 mesas (D10); testes atualizados.
- GATE: validateTable [] ×12; suíte de mesas verde; screenshots ×12.

### R5 — Modos: campanha e desafios (agente principal)
- Campanha (D8): estrelas por partida (mission done / score ≥ starScore /
  wizard), `starEarned` + toast + DMD, desbloqueio do Reator (18★),
  painel de campanha no menu (D18) com grade de 12 mesas e estrelas.
- Desafios (D9): 4 modos completos com recordes, tela de seleção,
  game over de desafio com recorde.
- Torneio 12 mesas.
- GATE: browser E2E de modos: campanha grava estrela persistente; desafio
  "tempo" encerra no relógio e grava recorde; Reator destrava com estrelas
  forçadas via progress; tsgo limpo.

### R6 — Metajogo: XP, skins, conquistas (agente principal)
- XP/nível (D11) com `levelInfo` testado; skins de bola (D12) selecionáveis
  nos ajustes; conquistas +12 (D13); stats +4 (D14); Painel Meta com nível,
  barra de XP e novas entradas.
- GATE: testes de progress verdes (xp, estrelas, desafios, unlocks);
  tsgo limpo.

### R7 — Áudio: trilha adaptativa (agente principal)
- Transições por evento (D17): wizard/desafio/frenesi mudam camadas e BPM;
  sfx novos (rampa, ímã, lock, estrela, challenge end) com pan.
- GATE: revisão de código dos ganchos + grafo WebAudio; sem erros de
  console; mute zera tudo.

### R8 — Shell: menu v3, HUD v3, game over v3 (agente principal)
- Menu v3 (D18): abas CAMPANHA e DESAFIOS, estrelas nos cards, cadeado do
  Reator, atrativo adaptado às abas novas. HUD v3 (D19): tracker de
  estrelas, relógio de desafio, badge de frenzy. Game over v3: estrelas
  ganhas, XP ganho com barra, recorde de desafio. Settings: skin de bola.
- GATE: fluxo completo no browser (menu → campanha → jogo → estrela →
  game over com XP); tutorial atualizado; atrativo nas abas novas.

### R9 — Verificação final (agente principal)
- Playthrough E2E completo (mesas novas, rampa/ímã/lock/patrulha, campanha,
  4 desafios, torneio 12, XP/skin, atrativo); regressão total (recordes
  `neonvolt.v1`, progresso v1 tolerante, hooks DEV); build de produção.
- GATE: critérios de aceite §7 todos verdes.

## 6. Especificações de detalhe

### 6.1 Rampa (D1) — comportamento exato
- Sensor por segmentos: o engine cria corpos-sensor invisíveis ao longo do
  path (como gates); ao tocar o segmento 0 (ou qualquer segmento se vindo
  do início), a bola entra em "modo rampa": posição interpolada pelo path
  à velocidade atual (mín. 8 px/tick), direção tangente ao path.
- Ao chegar ao fim: a bola é devolvida ao playfield no `path[last]` com
  velocidade tangente × `boost`; evento `rampRun` (score + pos); luz da
  rampa acesa 1,5s (`rampHeat`); DMD "RAMPA +N" em missões.
- Cancelamento: se o tick de interpolação falhar (guard), a bola é solta no
  ponto atual — nunca presa. Rampa NÃO é parede física: a bola pode passar
  por baixo dela (o sensor é de entrada apenas).
- Visual: fita elevada — dois trilhos do path + preenchimento escuro, sombra
  projetada no fundo, brilho de cabeceira na entrada e saída.

### 6.2 As 5 mesas novas — identidade (o agente de conteúdo detalha geometria)
Regras de autoria: coordenadas 540×960; elementos em x∈(16,486), y∈(60,860);
lane à direita (x>486 livre); flippers padrão `FLIPPERS`; kickback esquerdo;
dreno y=990; nada sobre os flippers (y>780 exceto guias); espaçamento ≥40px
entre elementos com raio; ids únicos prefixados pela mesa; 2 mini-missões
(5.000–7.500); missão assinatura 12.000–15.000; `starScore` entre 60.000 e
120.000 conforme dificuldade.

1. **Orquestra Neural** (`orquestra-neural`): bg #0a0618; wall #c084fc;
   glowA #e879f9; glowB #f0abfc; hot #fef08a; dim #4c1d95. Tema: tecido
   neural. Mecânica de identidade: **2 ímãs-sinapse** que puxam a bola para
   dentro das rampas; 2 rampas-fibra (path em arco); missão "Sinfonia"
   (goal ramp: 2 travessias na rampa principal → multiball 2); minis:
   "Impulso" (íms × N hits no bumper-soma) e "Reflexo" (spinnerHold).
2. **Deserto Estático** (`deserto-estatico`): bg #140d05; wall #fbbf24;
   glowA #f59e0b; glowB #2dd4bf; hot #fde68a; dim #78350f. Tema: duna de
   tempestade. Mecânica: **2 bumpers em patrulha** (escaravelhos percorrendo
   cristas) + rampa-cânion; missão "Trovão Seco" (hits no bumper patrulheiro
   10× → jackpot 15.000); minis: "Miragem" (spinnerHold) e "Caravana"
   (grupo de drops "dunas").
3. **Catedral Fônica** (`catedral-fonica`): bg #060a18; wall #93c5fd;
   glowA #60a5fa; glowB #e2e8f0; hot #fde047; dim #1e3a8a. Tema: tubos de
   órgão. Mecânica: **2 rampas-tubo** (a dupla travessia é o coração da
   mesa) + banca de 4 drops "acordes"; missão "Réquiem em Volt" (goal ramp:
   1 travessia em CADA rampa → jackpot 15.000); minis: "Diapasão"
   (spinnerHold) e "Coro" (grupo acordes).
4. **Cidade Vapor** (`cidade-vapor`): bg #0f0a08; wall #facc15; glowA #fb923c;
   glowB #a3e635; hot #fef3c7; dim #713f12. Tema: engrenagens de latão.
   Mecânica: **ball lock** — kicker "Compressor" com `lock: true`; a missão
   derruba o grupo "válvulas" e solta o lock + multiball; 1 rampa-pipa de
   vapor; 1 ímã-ímã de sucesso é proibido aqui (identidade = lock).
   Minis: "Pressão" (hits no caldeira) e "Pistão" (spinnerHold).
5. **Reator Final** (`reator-final`, `lockedByStars: 18`): bg #0d0208;
   wall #f87171; glowA #fca5a5; glowB #fef9c3; hot #ffffff; dim #7f1d1d.
   Tema: sala do reator em alarme. Mecânica: TUDO ao mesmo tempo — 2 rampas,
   2 ímãs, 2 bumpers em patrulha, banca de 5 drops, kicker com lock;
   missão "Colapso do Reator" (goal ramp: 2 travessias na rampa núcleo +
   jackpot 50.000 como reward); minis: "Efeito Domo" (grupo) e "Meia-vida"
   (hits 20 no bumper núcleo); starScore 150.000. maxBalls 3.
   Fundo: alarme cardíaco pulsante (D15).

### 6.3 Retune das 7 mesas existentes
- Cada mesa ganha **1 rampa própria** (geometria coerente com o layout
  atual, path no terço superior, entrada acessível do flipper):
  Circuito "Duto de Sinal", Forja "Garganta Fundida", Abissal "Corrente
  Ascendente", Criogênese "Tubo Criogênico", Supernova "Anel de Fusão",
  Tesla "Bobina em Loop", Núcleo "Pipeline".
- Ímãs onde temático: Abissal "correnteza" (1 ímã suave), Criogênese
  "câmara" (1 ímã), Supernova "gravidade" (1 ímã).
- Patrulha onde temático: Abissal (medusa-patrulha), Deserto já nasce com
  ela; Forja (bigorna oscilante → na verdade patrulha de bumper leve).
- `starScore`: Circuito 60.000; Forja 70.000; Abissal 60.000; Criogênese
  65.000; Supernova 80.000; Tesla 75.000; Núcleo 85.000.
- Kickers ganham `lock: true` em Núcleo Zero (identidade pré-existente de
  "porta") — solta com a missão Root Access.
- Balance: nada abaixo do padrão 3.0; scores de rampa 1.000–2.500 por
  travessia.

### 6.4 Campanha (D8) — regras exatas
- Estrelas por partida (avaliadas no fim da partida, em PinballApp, com
  `GameStatsSummary` + score): ① `missionCompleted`; ② `score ≥ starScore`;
  ③ `wizardModes ≥ 1`. Estrelas só contam em partida NORMAL (torneio conta,
  desafio não).
- Nova estrela → evento/toast "ESTRELA ⭐ (n/3) — {mesa}" e DMD "STAR +1".
- `totalStars()` = soma; Reator destrava com ≥18 (fora das próprias do
  Reator); painel mostra `N/36`.
- Desbloqueio é UI: menu não lista o Reator como jogável até destravar;
  badge "TRANCA — 18★" com contagem atual.

### 6.5 Desafios (D9) — modificadores exatos
| id | tempo | bolas iniciais | ball save | extra | mult | dreno | notas |
|---|---|---|---|---|---|---|---|
| tempo | 120s | 1 | 3s | ✗ | ×1 | normal | relógio no HUD+DMD; fim = `challengeEnded(timeout)` |
| umabola | — | 1 | ✗ | ✗ | ×1 | normal | sem bola extra nem save |
| caos | — | 3 simultâneas | ✗ | ✓ | ×1 | normal | maxBalls 3 forçado |
| frenesi | — | 1 | 5s | ✓ | ×2 | −20% tempo de dreno? → dreno +20% velocidade | combo janela −30%; DMD "FRENESI" |
- Recordes por desafio (`challengeBest`); game over de desafio mostra
  "RECORDE DO DESAFIO"; stats `challengesPlayed++`.
- XP de desafio = metade (D11). Estrelas de campanha não contam (§6.4).

### 6.6 XP e nível (D11)
- `grantXp(score)`: `xp += floor(score/100)` (desafios: `/200`); salvo no
  progress; nível derivada: `needed(n) = 2000 + (n−1)·1500` (cumulativa:
  nível 2 aos 2.000 XP, nível 3 aos 5.500, ...). `levelInfo(xp)` retorna
  `{ level, into, span, pct }` — função pura, testada.
- Skins: L2 "Plasma" (núcleo branco + estela violeta), L4 "Ouro" (dourada),
  L6 "Holográfica" (aresta ciano translúcida), L8 "Vórtice" (estela
  helicoidal). `Settings.ballSkin` só aceita skin já destravada (guard na
  UI); o renderer recebe a skin via RenderView/flag global de jogo.

### 6.7 Fundos vivos (D15) — fenômeno por mesa
2 camadas animadas + 1 fenômeno, budget: desenho vetorial barato (sem
imagem), reducedFx corta o fenômeno (mantém 1 camada estática):
- Circuito: pulso de sinal correndo no grid; Forja: brasas ascendentes;
  Abissal: plâncton deriva + "ressaca" senoidal; Criogênese: neve suave +
  gelo crescendo nas bordas; Supernova: poeira orbital + flare periódico;
  Tesla: arcos-relâmpago periódicos no fundo; Núcleo: bytes caindo;
  Neural: sinapses piscando em rede; Deserto: areia à deriva + miragem;
  Fônica: anéis de onda concêntricos; Vapor: vapor ascendente + engrenagem
  gigante girando; Reator: pulso cardíaco vermelho + alerta intermitente.

### 6.8 DMD colorido e novas mensagens (§4.4)
- Cor da mensagem = paleta da mesa por padrão (wall); eventos críticos
  (JACKPOT/WIZARD) em `hot`; campanha em `glowA`.
- Novas mensagens priorizadas: WIZARD > JACKPOT > FRENESI > MULTI-BALL >
  MYSTERY > BOLA EXTRA > RAMPA (missão) > ESTRELA > MISSÃO > COMBO ≥10 >
  skill shot > bancas > LOCK > padrão.
- Star animation: raio varrendo a borda 1,2s.

### 6.9 Menu v3 e HUD v3 (D18/D19)
- Menu: abas MESAS / CAMPANHA / DESAFIOS / ESTATÍSTICAS / CONQUISTAS /
  AJUSTES (6 abas, teclado ←/→); grade de campanha 12 cartões com 3 estrelas
  cada + progresso total; desafios: 4 cartões (nome, regra em 1 linha,
  recorde); card de mesa com estrelas pequenas; cadeado no Reator.
- HUD: linha de estrelas (3 pontos: vazio/cheio) ao lado do objetivo;
  em desafio, chip do modo + relógio; badge FRENESI quando ativo.
- Game over: estrelas ganhas nesta partida (animação 3-pontos), "+N XP"
  com barra até o próximo nível, recorde de desafio quando aplicável.

### 6.10 Perf e guards
- Ímã: força aplicada só a bolas dentro do raio (sem query de mundo toda).
- Patrulha: `setVelocity`/posição via Matter Body.setPosition — colisões
  continuam válidas; guard anti-tunneling: velocidade máx 1,2 px/tick.
- Rampa: reparametrização por comprimento de arco; `t += speed/len`.
- `noUncheckedIndexedAccess`: guards `?? default` em todo acesso de path.

## 7. Critérios de aceite (produto final)

1. Abrir `/`: menu com 12 mesas nas abas MESAS/CAMPANHA, Reator trancado
   (18★), 4 desafios com recordes; zero erros de console.
2. Rampa: a bola lançada com força média entra, percorre e sai acelerada
   com evento e luz; em Catedral Fônica as DUAS rampas pontuam.
3. Ímã: bola dentro do raio desvia visivelmente (Abissal/Neural); evento
   `magnetPulled` conta para stats/conquista.
4. Patrulha: bumper se move no path e colide corretamente (Deserto).
5. Lock: em Cidade Vapor, kicker retém a bola; ao completar a missão, as
   bolas presas são soltas com o multiball (DMD "LOCK +MULTIBALL").
6. Campanha: partida normal concede estrelas corretas; estrela persiste
   após reload; Reator destrava com ≥18★.
7. Desafios: "tempo" encerra aos 120s e grava recorde; "caos" começa com 3
   bolas; "frenesi" dobra score e DMD anuncia; "umabola" não dá bola extra.
8. Torneio 12 mesas × 2 bolas com total cumulativo e recorde próprio.
9. XP: fim de partida mostra "+N XP" e o nível sobe nos limiares; skin
   destravada fica selecionável e muda o visual da bola.
10. 12 mesas validam ([]); cada uma com rampa; suítes verdes.
11. DMD colorido por mesa; ESTRELA/WIZARD/JACKPOT com cores e animações.
12. Música reage (wizard/desafio/frenesi); mute zera tudo.
13. Regressão: recordes `neonvolt.v1` preservados; progress v1 carrega com
    defaults; testes antigos intactos e verdes; hooks DEV presentes.
14. Build de produção sem erros; sem import estático de matter-js em SSR;
    60fps com reducedFx respeitado.

## 8. Riscos e mitigações
- **Rampa engole a bola**: cancelamento com guard + soltura no ponto atual
  (§6.1); testes de travessia e de interrupção.
- **Patrulha tunneling**: speed máx 1,2 px/tick + espessura física ≥14.
- **Lock trava o jogo**: timeout de segurança — bola presa é solta em 25s
  (WINDOW_LOCK_TICKS) ou no fim de bola.
- **Desafio tempo + SSR**: relógio só no engine (ticks), nunca em Date.now
  do render; pausa congela o relógio.
- **Escolha de skin antes de destravar**: guard na UI + default cromada.
- **12 mesas = validação rígida**: `validateTable` estendido RODA nas 12 no
  teste de mesas; nada entra com [] ≠ 0.
- **Escopo gigante**: contratos primeiro (R1), fases independentes depois;
  cada fase com gate próprio.
- **noUncheckedIndexedAccess**: guards `?? default` em todo acesso.

## 9. Fora de escopo
Multiplayer, backend/contas, cloud saves, editor de mesas, i18n além de
pt-BR, rotas novas além de `/`, física de magnetos reais (ímã é força
radial simples), video mode, tabelas dinâmicas geradas por IA.

## 10. Registro de decisões da execução (remix 4)
(preenchido durante a execução, numerado na sequência do PRD)
