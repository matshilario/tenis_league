/**
 * Banco de cenas da quadra.
 *
 * Trilha "main": tenista e bola (uma cena por vez).
 * Trilha "ambient": aparições do macaco-prego que não mexem na bola.
 * Cenas com `monkey: true` respeitam o intervalo mínimo entre aparições do macaco.
 *
 * Para criar uma cena: escreva um gerador que comanda e.player / e.ball / e.monkey e
 * faz `yield` de segundos (número) ou de uma condição (() => boolean); depois
 * registre em SCENES com um peso.
 */

import { clamp, lerp, rand, singlesAt, type CourtEngine, type SceneDef, type Script, type Vec } from './engine'

const CONTACT_Z = 9

/** Bola vem do adversário (por cima da rede) e quica do nosso lado. */
function incoming(e: CourtEngine, target: Vec, bounceT = 0.62) {
  const g = e.geo
  const x0 = g.cx + rand(-0.55, 0.55) * g.hwTop
  const bounce: Vec = { x: lerp(x0, target.x, bounceT), y: rand(g.serviceY - 2, g.baseY - 10), z: 0 }
  e.ball.start({ x: x0, y: 1, z: 8 }, [
    { to: bounce, dur: 0.55, arc: 5 },
    { to: target, dur: 0.42, arc: 3 },
  ])
  return { bounce, t: 0.97 }
}

/** Um golpe: corre, prepara, bate e devolve por cima da rede. */
function* shot(e: CourtEngine): Script {
  const g = e.geo
  const side = Math.random() < 0.6 ? 1 : -1 // forehand é mais comum
  const lim = singlesAt(g, g.playerY) - 4
  const px = clamp(e.player.x + rand(-46, 46), g.cx - lim, g.cx + lim)
  const contact: Vec = { x: px + side * 8, y: g.playerY - 3, z: CONTACT_Z }
  const { t } = incoming(e, contact)
  e.player.moveTo(px, 62)
  yield t - 0.16
  e.player.play([['prep', 0.16]], side < 0)
  yield 0.16
  e.player.play([['hit', 0.1], ['follow', 0.24]], side < 0)
  const out: Vec = { x: g.cx + rand(-0.5, 0.5) * g.hwTop, y: -3, z: 34 }
  e.ball.setLegs([{ to: out, dur: 0.72, arc: 6, vanish: true }])
  yield 0.72
  yield rand(0.35, 0.8) // tempo do adversário
}

function* backToCenter(e: CourtEngine): Script {
  e.player.moveTo(e.geo.cx + rand(-6, 6), 45)
  yield () => !e.player.moving
}

/** Saque: lança a bola, estica e bate. */
function* serve(e: CourtEngine): Script {
  const g = e.geo
  const sx = g.cx + (Math.random() < 0.5 ? -12 : 12)
  e.player.moveTo(sx, 45)
  yield () => !e.player.moving
  yield 0.5
  e.ball.start({ x: sx - 2, y: g.playerY - 1, z: 10 }, [{ to: { x: sx - 1, y: g.playerY - 1, z: 28 }, dur: 0.5, arc: 0 }])
  e.player.play([['toss', 0.5]])
  yield 0.5
  e.player.play([['serve', 0.12], ['follow', 0.3]])
  const tgt: Vec = { x: g.cx + (sx < g.cx ? 1 : -1) * rand(10, 0.5 * g.hwTop), y: -3, z: 36 }
  e.ball.setLegs([{ to: tgt, dur: 0.6, arc: 4, vanish: true }])
  yield 0.6
  yield rand(0.4, 0.8)
}

/** Ponto termina: ou o adversário erra, ou a gente manda na rede. */
function* pointEnd(e: CourtEngine): Script {
  const g = e.geo
  if (Math.random() < 0.55) {
    // adversário não devolve: comemora
    yield 0.6
    e.player.play([['cheer', 0.35], ['idle', 0.15], ['cheer', 0.35]])
    yield 1.2
    return
  }
  // nossa bola morre na rede
  const side = Math.random() < 0.6 ? 1 : -1
  const lim = singlesAt(g, g.playerY) - 4
  const px = clamp(e.player.x + rand(-30, 30), g.cx - lim, g.cx + lim)
  const contact: Vec = { x: px + side * 8, y: g.playerY - 3, z: CONTACT_Z }
  const { t } = incoming(e, contact)
  e.player.moveTo(px, 62)
  yield t - 0.16
  e.player.play([['prep', 0.16]], side < 0)
  yield 0.16
  e.player.play([['hit', 0.1], ['follow', 0.3]], side < 0)
  const netX = clamp(contact.x + rand(-25, 25), g.cx - g.hwTop + 4, g.cx + g.hwTop - 4)
  e.ball.setLegs([
    { to: { x: netX, y: 9, z: 5 }, dur: 0.45, arc: 3 },
    { to: { x: netX, y: 11, z: 0 }, dur: 0.2, arc: 0 },
    { to: { x: netX + 2, y: 12, z: 0 }, dur: 0.4, arc: 1 },
  ])
  yield 0.8
  e.player.play([['shrug', 1.1]])
  yield 1.4
  e.ball.hide()
}

function* rally(e: CourtEngine): Script {
  // até a primeira aparição do macaco, pontos curtos: ele entra logo
  const n = e.monkeySeen ? Math.floor(rand(2, 6)) : 1
  for (let i = 0; i < n; i++) yield* shot(e)
  yield* pointEnd(e)
  yield* backToCenter(e)
  yield rand(0.6, 1.4)
}

function* serveAndRally(e: CourtEngine): Script {
  yield* serve(e)
  const n = e.monkeySeen ? Math.floor(rand(1, 4)) : 0
  for (let i = 0; i < n; i++) yield* shot(e)
  yield* pointEnd(e)
  yield* backToCenter(e)
}

/** O clássico: o macaco entra correndo, pega a bola e some. */
function* monkeyStealsBall(e: CourtEngine): Script {
  const g = e.geo
  const fromLeft = Math.random() < 0.5
  const restX = g.cx + (fromLeft ? -1 : 1) * rand(0.15, 0.45) * g.hwBot
  const rest: Vec = { x: restX, y: rand(g.serviceY + 2, g.baseY - 6), z: 0 }
  const x0 = g.cx + rand(-0.4, 0.4) * g.hwTop
  const bounce: Vec = { x: lerp(x0, rest.x, 0.6), y: rest.y - 8, z: 0 }
  e.ball.start({ x: x0, y: 1, z: 8 }, [
    { to: bounce, dur: 0.55, arc: 5 },
    { to: rest, dur: 0.5, arc: 2 },
    { to: { x: rest.x + (fromLeft ? -3 : 3), y: rest.y + 1, z: 0 }, dur: 0.5, arc: 0 },
  ])
  const edge = fromLeft ? -14 : g.W + 14
  e.monkey.enter(edge, rest.y)
  e.monkey.moveTo(rest.x + (fromLeft ? -6 : 6), rest.y, 85)
  // o tenista corre, mas não chega a tempo
  e.player.moveTo(rest.x + (fromLeft ? 20 : -20), 38)
  yield () => e.monkey.arrived
  e.ball.carriedBy = 'monkey'
  yield 0.25
  e.monkey.moveTo(edge, rest.y + rand(-4, 4), 95)
  e.player.stop()
  e.player.play([['shrug', 1.4]])
  yield () => e.monkey.arrived
  e.monkey.leave()
  e.ball.hide()
  yield 0.8
  yield* backToCenter(e)
}

/** O macaco senta perto do poste da rede e assiste ao jogo. */
function* monkeyWatches(e: CourtEngine): Script {
  const g = e.geo
  const fromLeft = Math.random() < 0.5
  const edge = fromLeft ? -14 : g.W + 14
  const spot = fromLeft ? g.postL - 6 : g.postR + 6
  e.monkey.enter(edge, 17)
  e.monkey.moveTo(spot, 17, 70)
  yield () => e.monkey.arrived
  e.monkey.state = 'sit'
  const until = e.time + rand(7, 12)
  while (e.time < until) {
    e.monkey.lookAt = e.ball.visible ? e.ball.pos.x : e.player.x
    yield 0.2
  }
  e.monkey.lookAt = null
  e.monkey.moveTo(edge, 17, 85)
  yield () => e.monkey.arrived
  e.monkey.leave()
}

/** O macaco rouba a garrafa d'água do banco. */
function* monkeyBottle(e: CourtEngine): Script {
  const g = e.geo
  const bench = g.bench!
  e.monkey.enter(-14, bench.y + 2)
  e.monkey.moveTo(bench.x + 4, bench.y + 2, 70)
  yield () => e.monkey.arrived
  e.bottleOnBench = false
  e.monkey.carrying = 'bottle'
  e.monkey.state = 'sit'
  e.monkey.lookAt = e.player.x
  yield rand(2, 3.5)
  e.monkey.lookAt = null
  e.monkey.moveTo(-14, bench.y + 4, 90)
  yield () => e.monkey.arrived
  e.monkey.leave()
  e.bottleBackAt = e.time + 20 // alguém traz outra garrafa
}


/** O macaco faz cocô na mão, arremessa no tenista e foge; o tenista corre atrás. */
function* monkeyPoop(e: CourtEngine): Script {
  const g = e.geo
  const pl = e.player
  // entra pelo lado com mais espaço até o tenista
  const fromLeft = pl.x > g.cx ? true : pl.x < g.cx ? false : Math.random() < 0.5
  const dir = fromLeft ? -1 : 1
  const edge = fromLeft ? -14 : g.W + 14
  const y = g.playerY - 2
  const spot = clamp(pl.x + dir * rand(42, 64), 12, g.W - 12)
  e.monkey.enter(edge, y)
  e.monkey.moveTo(spot, y, 75)
  yield () => e.monkey.arrived
  e.monkey.lookAt = pl.x

  // agacha… e aparece o "presente" na mão
  e.monkey.forced = 'monkeySquat'
  yield 1.3
  e.monkey.forced = 'monkeySit'
  e.monkey.carrying = 'poop'
  e.poop.start({ x: spot, y, z: 4 }, [])
  yield 1.1

  // arremesso em arco até a cabeça do tenista
  e.monkey.forced = 'monkeyThrow'
  yield 0.18
  e.monkey.carrying = null
  const flight = Math.abs(spot - pl.x) / 90 + 0.25
  e.poop.setLegs([{ to: { x: pl.x, y: pl.y, z: 16 }, dur: flight, arc: 9, vanish: true }])
  yield flight
  pl.splatUntil = e.time + 9
  pl.play([['shrug', 0.35], ['idle', 0.1], ['shrug', 0.35]])
  e.say('FILHA DA PUTA!', 2.2)
  e.monkey.forced = null
  yield 0.6

  // fuga e perseguição (o macaco é mais rápido)
  e.monkey.lookAt = null
  e.monkey.moveTo(edge, y + rand(-3, 3), 100)
  yield 0.3
  pl.moveTo(fromLeft ? -30 : g.W + 30, 82)
  yield () => e.monkey.arrived && !pl.moving
  e.monkey.leave()
  yield 2.2

  // volta pro fundo de quadra, ainda sujo
  pl.moveTo(g.cx + rand(-6, 6), 40)
  yield () => !pl.moving
  yield 1
}

export const SCENES: SceneDef[] = [
  { id: 'rally', track: 'main', weight: 5, run: rally },
  { id: 'serve', track: 'main', weight: 2, run: serveAndRally },
  { id: 'monkey-ball', track: 'main', weight: 3, monkey: true, run: monkeyStealsBall },
  { id: 'monkey-poop', track: 'main', weight: 10, monkey: true, run: monkeyPoop },
  { id: 'monkey-watch', track: 'ambient', weight: 1, run: monkeyWatches },
  { id: 'monkey-bottle', track: 'ambient', weight: 1, when: (e) => !!e.geo.bench && e.bottleOnBench, run: monkeyBottle },
]
