/*
 * ABOMINÁVEL — roguelike de ação 2D
 * HTML + CSS + JavaScript puro, canvas 960×640.
 * Código organizado em classes e comentado em português.
 */
(() => {
  'use strict';

  // ---------------------------------------------------------------------------
  // Constantes e utilidades
  // ---------------------------------------------------------------------------
  const WIDTH = 960;
  const HEIGHT = 640;
  const MAX_FLOORS = 3;
  const HUD_HEIGHT = 64;

  const ROOM = {
    left: 44,
    right: 916,
    top: 72,
    bottom: 598,
    cx: 480,
    cy: 335,
    width: 872,
    height: 526,
  };

  const DOOR_HALF = 31;
  const DIRECTIONS = {
    n: { dx: 0, dy: -1, opposite: 's', name: 'Norte' },
    s: { dx: 0, dy: 1, opposite: 'n', name: 'Sul' },
    e: { dx: 1, dy: 0, opposite: 'w', name: 'Leste' },
    w: { dx: -1, dy: 0, opposite: 'e', name: 'Oeste' },
  };
  const DIR_KEYS = Object.keys(DIRECTIONS);

  const COLORS = {
    bone: '#e8d4b7',
    boneDark: '#b99b80',
    blood: '#8f2928',
    red: '#d34b40',
    gold: '#e2ad47',
    floor: '#5b4033',
    floorDark: '#423026',
    wall: '#2b1b18',
    wallLight: '#69473a',
    black: '#100b0b',
    blue: '#69cce4',
    cyan: '#19ded5',
    magenta: '#df2ac6',
    green: '#77ad65',
    purple: '#8d5ca3',
  };

  const CHARACTERS = [
    {
      id: 'mau',
      name: 'COOW',
      subtitle: 'O ANDARILHO',
      tagline: 'Equilibrado e teimoso',
      health: 3,
      speed: 186,
      damage: 1.15,
      fireInterval: 0.34,
      range: 300,
      shotSpeed: 365,
      description: 'Boné, cicatrizes e um olhar que não recua.',
    },
    {
      id: 'coow',
      name: 'MAU',
      subtitle: 'O CIRCUITO',
      tagline: 'Rápido, frágil e elétrico',
      health: 2,
      speed: 235,
      damage: 0.72,
      fireInterval: 0.18,
      range: 250,
      shotSpeed: 430,
      description: 'Jaqueta neon, fones e reflexos sob tensão.',
    },
  ];

  const PASSIVE_ITEMS = [
    { id: 'damage', name: 'Lâmina de Obsidiana', short: 'DANO', desc: '+0,55 de dano', color: '#d74b3e' },
    { id: 'speed', name: 'Botas de Cinza', short: 'VELOCIDADE', desc: '+20 de velocidade', color: '#6ac7b5' },
    { id: 'range', name: 'Olho do Abismo', short: 'ALCANCE', desc: '+65 de alcance', color: '#87a9d9' },
    { id: 'double', name: 'Eco de Lágrimas', short: 'TIRO DUPLO', desc: 'Dois projéteis por disparo', color: '#df2ac6' },
  ];

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  const randInt = (min, max) => Math.floor(rand(min, max + 1));
  const choice = (list) => list[Math.floor(Math.random() * list.length)];
  const distance = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
  const hash01 = (x, y, seed = 0) => {
    const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return n - Math.floor(n);
  };

  function circleRect(cx, cy, radius, rect) {
    const closestX = clamp(cx, rect.x, rect.x + rect.w);
    const closestY = clamp(cy, rect.y, rect.y + rect.h);
    return (cx - closestX) ** 2 + (cy - closestY) ** 2 < radius ** 2;
  }

  function circlesOverlap(ax, ay, ar, bx, by, br) {
    return (ax - bx) ** 2 + (ay - by) ** 2 < (ar + br) ** 2;
  }

  function resolveCircleRect(entity, rect) {
    const closestX = clamp(entity.x, rect.x, rect.x + rect.w);
    const closestY = clamp(entity.y, rect.y, rect.y + rect.h);
    let dx = entity.x - closestX;
    let dy = entity.y - closestY;
    const d2 = dx * dx + dy * dy;
    if (d2 >= entity.radius * entity.radius) return false;
    if (d2 < 0.0001) {
      dx = entity.x - (rect.x + rect.w / 2);
      dy = entity.y - (rect.y + rect.h / 2);
    }
    const len = Math.hypot(dx, dy) || 1;
    const push = entity.radius - Math.sqrt(d2) + 0.2;
    entity.x += (dx / len) * push;
    entity.y += (dy / len) * push;
    return true;
  }

  function normalize(x, y) {
    const len = Math.hypot(x, y);
    if (len < 0.0001) return { x: 0, y: 0 };
    return { x: x / len, y: y / len };
  }

  // ---------------------------------------------------------------------------
  // Áudio procedural (Web Audio API)
  // ---------------------------------------------------------------------------
  class AudioManager {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.sfxGain = null;
      this.musicGain = null;
      this.compressor = null;
      this.noiseBuffer = null;
      this.enabled = true;
      this.sfxEnabled = true;

      // Sequenciador da trilha chiptune/dubstep.
      this.musicEnabled = true;
      this.musicMode = 'dungeon';
      this.musicTimer = null;
      this.nextMusicTime = 0;
      this.musicStep = 0;
      this.musicLength = 64;

      // Motivo de 4 compassos: baixo "wobble", lead 8-bit e bateria half-time.
      this.bassPattern = [
        73.42, 0, 73.42, 0, 87.31, 0, 73.42, 0, 98.0, 0, 82.41, 0, 73.42, 0, 65.41, 0,
        73.42, 0, 73.42, 0, 87.31, 0, 110.0, 0, 98.0, 0, 82.41, 0, 73.42, 0, 65.41, 0,
        73.42, 0, 73.42, 0, 87.31, 0, 73.42, 0, 110.0, 0, 98.0, 0, 87.31, 0, 82.41, 0,
        73.42, 0, 87.31, 0, 98.0, 0, 110.0, 0, 98.0, 0, 87.31, 0, 73.42, 0, 65.41, 0,
      ];
      this.leadPattern = [
        293.66, 0, 349.23, 0, 440.0, 0, 349.23, 0, 293.66, 0, 392.0, 0, 349.23, 0, 293.66, 0,
        293.66, 0, 349.23, 0, 440.0, 0, 523.25, 0, 392.0, 0, 349.23, 0, 293.66, 0, 261.63, 0,
        587.33, 0, 523.25, 0, 440.0, 0, 392.0, 0, 349.23, 0, 392.0, 0, 440.0, 0, 523.25, 0,
        587.33, 0, 659.25, 0, 523.25, 0, 440.0, 0, 392.0, 0, 349.23, 0, 293.66, 0, 261.63, 0,
      ];

      // Faixa exclusiva do chefe: mais rápida, cromática e agressiva.
      this.bossBassPattern = [
        55.0, 0, 55.0, 0, 58.27, 0, 55.0, 0, 61.74, 0, 58.27, 0, 55.0, 0, 49.0, 0,
        55.0, 0, 55.0, 0, 58.27, 0, 55.0, 0, 65.41, 0, 61.74, 0, 58.27, 0, 55.0, 0,
        55.0, 0, 55.0, 0, 58.27, 0, 55.0, 0, 61.74, 0, 58.27, 0, 55.0, 0, 49.0, 0,
        55.0, 0, 65.41, 0, 61.74, 0, 58.27, 0, 55.0, 0, 49.0, 0, 46.25, 0, 49.0, 0,
      ];
      this.bossLeadPattern = [
        440.0, 0, 466.16, 0, 523.25, 0, 466.16, 0, 440.0, 0, 392.0, 0, 349.23, 0, 329.63, 0,
        440.0, 0, 466.16, 0, 554.37, 0, 523.25, 0, 466.16, 0, 440.0, 0, 392.0, 0, 349.23, 0,
        440.0, 0, 466.16, 0, 523.25, 0, 466.16, 0, 440.0, 0, 392.0, 0, 349.23, 0, 329.63, 0,
        587.33, 0, 554.37, 0, 523.25, 0, 466.16, 0, 440.0, 0, 415.3, 0, 392.0, 0, 349.23, 0,
      ];
    }

    unlock() {
      if (!this.enabled) return;
      try {
        if (!this.ctx) {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          if (!Ctx) {
            this.enabled = false;
            return;
          }
          this.ctx = new Ctx();

          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.value = -18;
          this.compressor.knee.value = 18;
          this.compressor.ratio.value = 4;
          this.compressor.attack.value = 0.008;
          this.compressor.release.value = 0.22;
          this.compressor.connect(this.ctx.destination);

          this.master = this.ctx.createGain();
          this.master.gain.value = 0.17;
          this.master.connect(this.compressor);

          this.sfxGain = this.ctx.createGain();
          this.sfxGain.gain.value = this.sfxEnabled ? 1 : 0;
          this.sfxGain.connect(this.master);

          this.musicGain = this.ctx.createGain();
          this.musicGain.gain.value = 0.62;
          this.musicGain.connect(this.master);

          this.createNoiseBuffer();
        }
        if (this.ctx.state === 'suspended') this.ctx.resume();
        this.startMusic();
      } catch (error) {
        this.enabled = false;
      }
    }

    createNoiseBuffer() {
      const length = Math.floor(this.ctx.sampleRate * 0.25);
      this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
      const data = this.noiseBuffer.getChannelData(0);
      for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    }

    tone(freq, duration, type = 'square', volume = 0.35, slide = 0) {
      if (!this.ctx || !this.sfxGain || !this.enabled || !this.sfxEnabled) return;
      try {
        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), now + duration);
        gain.gain.setValueAtTime(volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
        osc.connect(gain);
        gain.connect(this.sfxGain);
        osc.start(now);
        osc.stop(now + duration + 0.03);
      } catch (error) {
        // Áudio é opcional; o jogo continua mesmo se o navegador bloquear.
      }
    }

    // -----------------------------------------------------------------------
    // Trilha sonora procedural: dubstep em 8 bits
    // -----------------------------------------------------------------------
    startMusic() {
      if (!this.enabled || !this.musicEnabled || !this.ctx || !this.musicGain || this.musicTimer) return;
      const now = this.ctx.currentTime;
      this.musicStep = 0;
      this.nextMusicTime = now + 0.06;
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), now);
      this.musicGain.gain.linearRampToValueAtTime(0.62, now + 0.35);
      this.musicTimer = setInterval(() => this.scheduleMusic(), 75);
    }

    stopMusic() {
      if (this.musicTimer) {
        clearInterval(this.musicTimer);
        this.musicTimer = null;
      }
      if (this.ctx && this.musicGain) {
        const now = this.ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(Math.max(0.0001, this.musicGain.gain.value), now);
        this.musicGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      }
    }

    toggleMusic() {
      this.musicEnabled = !this.musicEnabled;
      if (this.musicEnabled) {
        this.unlock();
        this.startMusic();
      } else {
        this.stopMusic();
      }
      return this.musicEnabled;
    }

    setMusicMode(mode) {
      if (!['dungeon', 'boss'].includes(mode) || this.musicMode === mode) return;
      this.musicMode = mode;
      this.musicStep = 0;
      if (this.ctx) this.nextMusicTime = this.ctx.currentTime + 0.04;
    }

    toggleSfx() {
      this.sfxEnabled = !this.sfxEnabled;
      if (this.sfxEnabled) {
        this.unlock();
        if (this.sfxGain) this.sfxGain.gain.value = 1;
      } else if (this.sfxGain) {
        this.sfxGain.gain.value = 0;
      }
      return this.sfxEnabled;
    }

    getStepDuration() {
      // O chefe tem uma faixa mais veloz: 158 BPM contra 140 BPM.
      const tempo = this.musicMode === 'boss' ? 158 : 140;
      return 60 / tempo / 4;
    }

    scheduleMusic() {
      if (!this.ctx || !this.musicEnabled || this.ctx.state !== 'running') return;
      const now = this.ctx.currentTime;
      const stepDuration = this.getStepDuration();
      // Evita acumular notas atrasadas quando a aba fica em segundo plano.
      if (this.nextMusicTime < now - 0.35) this.nextMusicTime = now + 0.04;
      while (this.nextMusicTime < now + 0.22) {
        this.playMusicStep(this.musicStep, this.nextMusicTime);
        this.musicStep = (this.musicStep + 1) % this.musicLength;
        this.nextMusicTime += stepDuration;
      }
    }

    playMusicStep(step, time) {
      const bossMode = this.musicMode === 'boss';

      if (bossMode) {
        if ([0, 6, 16, 22, 30, 32, 38, 48, 54, 62].includes(step)) this.playKick(time);
        if ([8, 24, 40, 56].includes(step)) this.playSnare(time);
        if (step % 2 === 0) this.playHat(time, step % 8 === 0 ? 0.042 : 0.022);
        if (step === 0 || step === 32) this.playBossStab(time);
      } else {
        if (step % 2 === 0) this.playHat(time, step % 8 === 0 ? 0.036 : 0.02);
        if ([0, 16, 22, 32, 48, 54].includes(step)) this.playKick(time);
        if ([8, 24, 40, 56].includes(step)) this.playSnare(time);
      }

      const bass = (bossMode ? this.bossBassPattern : this.bassPattern)[step];
      if (bass) this.playWobbleBass(bass, time, step, bossMode);

      const lead = (bossMode ? this.bossLeadPattern : this.leadPattern)[step];
      if (lead) this.playLead(lead, time, bossMode);
    }

    playKick(time) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(155, time);
      osc.frequency.exponentialRampToValueAtTime(43, time + 0.12);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.34, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.16);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.18);
    }

    playSnare(time) {
      if (!this.noiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 1100;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.12);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.14);

      const body = this.ctx.createOscillator();
      const bodyGain = this.ctx.createGain();
      body.type = 'triangle';
      body.frequency.setValueAtTime(185, time);
      body.frequency.exponentialRampToValueAtTime(105, time + 0.08);
      bodyGain.gain.setValueAtTime(0.09, time);
      bodyGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      body.connect(bodyGain);
      bodyGain.connect(this.musicGain);
      body.start(time);
      body.stop(time + 0.12);
    }

    playHat(time, volume) {
      if (!this.noiseBuffer) return;
      const noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 6200;
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(volume, time);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);
      noise.start(time);
      noise.stop(time + 0.045);
    }

    playWobbleBass(freq, time, step, bossMode = false) {
      const osc = this.ctx.createOscillator();
      const sub = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc.type = bossMode ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, time);
      sub.type = 'triangle';
      sub.frequency.setValueAtTime(freq / 2, time);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(bossMode ? 470 : 360, time);
      filter.Q.value = bossMode ? 10 : 7;
      lfo.type = 'sine';
      lfo.frequency.setValueAtTime((bossMode ? 6.5 : 4.5) + (step % 4) * (bossMode ? 2.4 : 1.7), time);
      lfoGain.gain.value = bossMode ? 430 : 310;
      lfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(bossMode ? 0.185 : 0.17, time + 0.008);
      gain.gain.setValueAtTime(bossMode ? 0.145 : 0.13, time + 0.07);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.145);

      osc.connect(filter);
      sub.connect(filter);
      filter.connect(gain);
      gain.connect(this.musicGain);

      osc.start(time);
      sub.start(time);
      lfo.start(time);
      osc.stop(time + 0.16);
      sub.stop(time + 0.16);
      lfo.stop(time + 0.16);
    }

    playLead(freq, time, bossMode = false) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = bossMode ? 'sawtooth' : 'square';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(bossMode ? 0.026 : 0.032, time + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + 0.11);
    }

    playBossStab(time) {
      // Estocada dissonante de trítono para marcar a faixa do chefe.
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(920, time);
      filter.Q.value = 4;
      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.055, time + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + 0.24);
      filter.connect(gain);
      gain.connect(this.musicGain);

      [110, 155.56].forEach((freq) => {
        const osc = this.ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        osc.connect(filter);
        osc.start(time);
        osc.stop(time + 0.26);
      });
    }

    shoot() { this.tone(510, 0.07, 'square', 0.22, 130); }
    hit() { this.tone(145, 0.06, 'sawtooth', 0.16, -35); }
    damage() { this.tone(95, 0.24, 'sawtooth', 0.38, -50); }
    door() { this.tone(260, 0.08, 'triangle', 0.3, 100); setTimeout(() => this.tone(410, 0.13, 'triangle', 0.24, 90), 70); }
    pickup() { this.tone(650, 0.08, 'sine', 0.42, 160); setTimeout(() => this.tone(920, 0.12, 'sine', 0.32, 100), 65); }
    bomb() { this.tone(90, 0.3, 'sawtooth', 0.55, -55); setTimeout(() => this.tone(48, 0.22, 'square', 0.4, -15), 55); }
    boss() { this.tone(62, 0.5, 'sawtooth', 0.45, -15); setTimeout(() => this.tone(52, 0.7, 'square', 0.36, -8), 160); }
    heal() { this.tone(560, 0.1, 'sine', 0.35, 180); setTimeout(() => this.tone(760, 0.12, 'sine', 0.28, 180), 90); }
    victory() {
      [523, 659, 784, 1046].forEach((freq, i) => setTimeout(() => this.tone(freq, 0.2, 'sine', 0.32, 20), i * 115));
    }
  }

  // ---------------------------------------------------------------------------
  // Jogador
  // ---------------------------------------------------------------------------
  class Player {
    constructor(character, x, y) {
      this.character = character;
      this.x = x;
      this.y = y;
      this.radius = 16;
      this.vx = 0;
      this.vy = 0;
      this.facing = 's';
      this.invulnerable = 0;
      this.shootCooldown = 0;
      this.bombCooldown = 0;
      this.walkTime = 0;
      this.bonuses = { damage: 0, speed: 0, range: 0, doubleShot: false };
      this.items = [];
      this.recalculate();
      this.health = this.maxHealth;
      this.bombs = 1;
      this.coins = 0;
    }

    get maxHealth() {
      return this.character.health * 2;
    }

    get maxHearts() {
      return this.character.health;
    }

    recalculate() {
      this.speed = this.character.speed + this.bonuses.speed;
      this.damage = this.character.damage + this.bonuses.damage;
      this.fireInterval = this.character.fireInterval;
      this.range = this.character.range + this.bonuses.range;
      this.shotSpeed = this.character.shotSpeed;
    }

    update(dt, game) {
      this.invulnerable = Math.max(0, this.invulnerable - dt);
      this.shootCooldown = Math.max(0, this.shootCooldown - dt);
      this.bombCooldown = Math.max(0, this.bombCooldown - dt);

      const keys = game.keys;
      const arrowX = (keys.has('ArrowRight') ? 1 : 0) - (keys.has('ArrowLeft') ? 1 : 0);
      const arrowY = (keys.has('ArrowDown') ? 1 : 0) - (keys.has('ArrowUp') ? 1 : 0);

      let moveX = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      let moveY = (keys.has('KeyS') ? 1 : 0) - (keys.has('KeyW') ? 1 : 0);
      if (game.arrowMode === 'move') {
        moveX += arrowX;
        moveY += arrowY;
      }

      const movement = normalize(moveX, moveY);
      const targetVX = movement.x * this.speed;
      const targetVY = movement.y * this.speed;
      const smoothing = 1 - Math.exp(-(movement.x || movement.y ? 13 : 9) * dt);
      this.vx += (targetVX - this.vx) * smoothing;
      this.vy += (targetVY - this.vy) * smoothing;

      game.moveEntity(this, this.vx * dt, this.vy * dt);

      if (movement.x || movement.y) {
        this.walkTime += dt;
        if (Math.abs(movement.x) > Math.abs(movement.y)) this.facing = movement.x > 0 ? 'e' : 'w';
        else this.facing = movement.y > 0 ? 's' : 'n';
      }

      let shootX = (keys.has('KeyL') ? 1 : 0) - (keys.has('KeyJ') ? 1 : 0);
      let shootY = (keys.has('KeyK') ? 1 : 0) - (keys.has('KeyI') ? 1 : 0);
      if (!shootX && !shootY && game.arrowMode === 'shoot') {
        shootX = arrowX;
        shootY = arrowY;
      }

      if (shootX || shootY) {
        this.facing = Math.abs(shootX) > Math.abs(shootY) ? (shootX > 0 ? 'e' : 'w') : (shootY > 0 ? 's' : 'n');
        if (this.shootCooldown <= 0) this.shoot(shootX, shootY, game);
      }
    }

    shoot(rawX, rawY, game) {
      const dir = normalize(rawX, rawY);
      const count = this.bonuses.doubleShot ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const offset = count === 1 ? 0 : i === 0 ? -5 : 5;
        const px = this.x + dir.x * 17 - dir.y * offset;
        const py = this.y + dir.y * 17 + dir.x * offset;
        game.projectiles.push(new Projectile({
          x: px,
          y: py,
          vx: dir.x * this.shotSpeed + this.vx * 0.18,
          vy: dir.y * this.shotSpeed + this.vy * 0.18,
          radius: count > 1 ? 5 : 6,
          damage: this.damage,
          range: this.range,
          owner: 'player',
          color: COLORS.blue,
        }));
      }
      this.shootCooldown = this.fireInterval;
      game.audio.shoot();
      game.shake = Math.max(game.shake, 0.8);
      for (let i = 0; i < 2; i++) {
        game.spawnParticle(this.x + dir.x * 18, this.y + dir.y * 18, rand(-25, 25), rand(-25, 25), COLORS.blue, rand(1, 3), 0.16);
      }
    }

    takeDamage(amount, game, sourceX = this.x, sourceY = this.y) {
      if (this.invulnerable > 0 || game.state !== 'play') return false;
      this.health = Math.max(0, this.health - amount);
      this.invulnerable = 1.25;
      game.shake = Math.max(game.shake, 8);
      game.damageFlash = 0.55;
      game.audio.damage();
      const away = normalize(this.x - sourceX, this.y - sourceY);
      this.vx += away.x * 150;
      this.vy += away.y * 150;
      for (let i = 0; i < 12; i++) {
        game.spawnParticle(this.x, this.y, rand(-130, 130), rand(-130, 130), i % 3 ? '#9e2d2b' : '#e8d4b7', rand(2, 5), rand(0.3, 0.65));
      }
      if (this.health <= 0) game.gameOver();
      return true;
    }

    heal(amount) {
      const previous = this.health;
      this.health = Math.min(this.maxHealth, this.health + amount);
      return this.health - previous;
    }

    addPassive(item, game) {
      if (!item) return;
      if (item.id === 'damage') this.bonuses.damage += 0.55;
      if (item.id === 'speed') this.bonuses.speed += 20;
      if (item.id === 'range') this.bonuses.range += 65;
      if (item.id === 'double') {
        if (this.bonuses.doubleShot) this.bonuses.damage += 0.35;
        else this.bonuses.doubleShot = true;
      }
      this.items.push(item);
      this.recalculate();
      game.audio.pickup();
    }

    draw(ctx, game) {
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + 21, 17, 7, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const blinking = this.invulnerable > 0 && Math.floor(this.invulnerable * 16) % 2 === 0;
      if (blinking) ctx.globalAlpha = 0.34;

      const sprite = game.characterSprites[CHARACTERS.indexOf(this.character)];
      if (sprite && sprite.ready) {
        const width = 48;
        const height = 68;
        ctx.drawImage(sprite, this.x - width / 2, this.y - height + 17, width, height);
      } else {
        drawCharacterFigure(ctx, this.character, this.x, this.y, 1, this.facing, null);
        // Pequeno indicador de direção, no estilo cartoon.
        if (this.bonuses.doubleShot) {
          ctx.fillStyle = COLORS.magenta;
          ctx.fillRect(this.x - 2, this.y - 37, 4, 4);
        }
      }

      ctx.globalAlpha = 1;
      if (this.shootCooldown > 0) {
        ctx.fillStyle = 'rgba(232,212,183,0.7)';
        ctx.fillRect(this.x - 11, this.y + 26, 22 * (1 - this.shootCooldown / this.fireInterval), 2);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Projéteis
  // ---------------------------------------------------------------------------
  class Projectile {
    constructor(options) {
      Object.assign(this, options);
      this.maxRange = options.range;
      this.traveled = 0;
      this.dead = false;
      this.life = options.range / Math.max(1, Math.hypot(options.vx, options.vy));
      this.radius = options.radius || 5;
      this.damage = options.damage || 1;
      this.owner = options.owner || 'player';
      this.color = options.color || COLORS.blue;
      this.wobble = Math.random() * Math.PI * 2;
      this.age = 0;
    }

    update(dt, game) {
      this.age += dt;
      const stepX = this.vx * dt;
      const stepY = this.vy * dt;
      this.x += stepX;
      this.y += stepY;
      this.traveled += Math.hypot(stepX, stepY);
      this.life -= dt;

      if (this.life <= 0 || this.traveled >= this.maxRange) {
        this.dead = true;
        return;
      }
      if (this.x < ROOM.left - 20 || this.x > ROOM.right + 20 || this.y < ROOM.top - 20 || this.y > ROOM.bottom + 20) {
        this.dead = true;
        return;
      }

      for (const obstacle of game.currentRoom.obstacles) {
        if (obstacle.type !== 'rock') continue;
        if (circleRect(this.x, this.y, this.radius, obstacle)) {
          this.dead = true;
          for (let i = 0; i < 4; i++) {
            game.spawnParticle(this.x, this.y, rand(-45, 45), rand(-45, 45), this.owner === 'player' ? COLORS.blue : COLORS.red, rand(1, 3), 0.25);
          }
          return;
        }
      }
    }

    draw(ctx) {
      const angle = Math.atan2(this.vy, this.vx);
      const isPlayer = this.owner === 'player';
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(angle);
      ctx.fillStyle = isPlayer ? 'rgba(105,204,228,0.18)' : 'rgba(211,75,64,0.16)';
      ctx.beginPath();
      ctx.ellipse(-9, 0, 12, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, this.radius + 2, this.radius, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = isPlayer ? '#d6f7ff' : '#ffd1a1';
      ctx.beginPath();
      ctx.arc(1, -2, Math.max(1.5, this.radius * 0.34), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Inimigos
  // ---------------------------------------------------------------------------
  const ENEMY_CONFIG = {
    chaser: { radius: 15, hp: 3.4, speed: 67, contact: 1, color: '#9f5747' },
    shooter: { radius: 15, hp: 3.1, speed: 56, contact: 1, color: '#a88a68' },
    jumper: { radius: 13, hp: 2.7, speed: 84, contact: 1, color: '#a63d6c' },
  };

  class Enemy {
    constructor(type, x, y, floor) {
      const config = ENEMY_CONFIG[type] || ENEMY_CONFIG.chaser;
      this.type = type;
      this.x = x;
      this.y = y;
      this.radius = config.radius;
      this.maxHp = config.hp + floor * (type === 'jumper' ? 0.7 : 1.1);
      this.hp = this.maxHp;
      this.speed = config.speed + floor * (type === 'jumper' ? 9 : 5);
      this.contactDamage = config.contact + (floor > 2 && type === 'jumper' ? 1 : 0);
      this.color = config.color;
      this.floor = floor;
      this.anim = Math.random() * 8;
      this.hitFlash = 0;
      this.shootTimer = rand(0.8, 1.7);
      this.jumpCooldown = rand(0.5, 1.4);
      this.dashTimer = 0;
      this.dashX = 0;
      this.dashY = 0;
      this.dead = false;
    }

    update(dt, game) {
      this.anim += dt;
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.shootTimer -= dt;
      this.jumpCooldown -= dt;

      const player = game.player;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const dir = { x: dx / dist, y: dy / dist };

      if (this.type === 'chaser') {
        const wobble = Math.sin(this.anim * 4.2) * 0.18;
        this.move(this.x + (dir.x - dir.y * wobble) * this.speed * dt, this.y + (dir.y + dir.x * wobble) * this.speed * dt, game);
      } else if (this.type === 'shooter') {
        let mx = 0;
        let my = 0;
        if (dist < 185) {
          mx = -dir.x;
          my = -dir.y;
        } else if (dist > 280) {
          mx = dir.x;
          my = dir.y;
        } else {
          const strafe = Math.sin(this.anim * 1.8) > 0 ? 1 : -1;
          mx = -dir.y * strafe;
          my = dir.x * strafe;
        }
        this.move(this.x + mx * this.speed * 0.7 * dt, this.y + my * this.speed * 0.7 * dt, game);

        if (this.shootTimer <= 0 && dist < 520) {
          this.shootTimer = Math.max(0.78, 1.65 - this.floor * 0.11);
          game.spawnEnemyProjectile(this.x, this.y, dx, dy, 180 + this.floor * 10, 1);
          this.anim += 0.4;
        }
      } else if (this.type === 'jumper') {
        if (this.dashTimer > 0) {
          this.dashTimer -= dt;
          this.move(this.x + this.dashX * this.speed * 2.8 * dt, this.y + this.dashY * this.speed * 2.8 * dt, game);
          if (Math.random() < 0.55) {
            game.spawnParticle(this.x, this.y + 8, rand(-18, 18), rand(-22, 2), '#6c4a3f', rand(1, 3), 0.22);
          }
        } else if (dist < 330 && this.jumpCooldown <= 0) {
          this.dashX = dir.x;
          this.dashY = dir.y;
          this.dashTimer = 0.31;
          this.jumpCooldown = rand(1.5, 2.35);
          game.audio.tone(220, 0.05, 'square', 0.08, 80);
        } else {
          this.move(this.x + dir.x * this.speed * 0.62 * dt, this.y + dir.y * this.speed * 0.62 * dt, game);
        }
      }
    }

    move(x, y, game) {
      const oldX = this.x;
      const oldY = this.y;
      this.x = x;
      this.y = y;

      for (const obstacle of game.currentRoom.obstacles) {
        if (obstacle.type === 'rock') resolveCircleRect(this, obstacle);
      }
      this.x = clamp(this.x, ROOM.left + this.radius, ROOM.right - this.radius);
      this.y = clamp(this.y, ROOM.top + this.radius, ROOM.bottom - this.radius);

      if (Math.abs(this.x - oldX) < 0.01 && Math.abs(this.y - oldY) < 0.01 && this.type !== 'shooter') {
        // Pequena variação evita que o perseguidor fique preso atrás de pedras.
        this.x += Math.sin(this.anim * 5) * 0.4;
      }
    }

    takeDamage(amount, game) {
      this.hp -= amount;
      this.hitFlash = 0.13;
      for (let i = 0; i < 7; i++) {
        game.spawnParticle(this.x, this.y, rand(-110, 110), rand(-110, 110), i % 3 === 0 ? '#e8d4b7' : this.color, rand(1.5, 4), rand(0.22, 0.5));
      }
      game.audio.hit();
      if (this.hp <= 0) this.dead = true;
    }

    draw(ctx, game) {
      const bounce = this.dashTimer > 0 ? 11 : Math.abs(Math.sin(this.anim * 3.5)) * 2;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.33)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.radius + 4, this.radius * 1.05, this.radius * 0.42, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(this.x, this.y - bounce);
      const flash = this.hitFlash > 0;
      if (this.type === 'chaser') this.drawChaser(ctx, flash);
      else if (this.type === 'shooter') this.drawShooter(ctx, flash);
      else this.drawJumper(ctx, flash);
      ctx.restore();

      if (this.hp < this.maxHp) {
        const width = this.type === 'boss' ? 70 : 28;
        ctx.fillStyle = 'rgba(15,8,8,0.8)';
        ctx.fillRect(this.x - width / 2, this.y - this.radius - 14, width, 4);
        ctx.fillStyle = this.type === 'boss' ? COLORS.red : '#b9a46f';
        ctx.fillRect(this.x - width / 2, this.y - this.radius - 14, width * clamp(this.hp / this.maxHp, 0, 1), 4);
      }
    }

    drawChaser(ctx, flash) {
      ctx.fillStyle = flash ? '#f2d7b2' : '#2c1718';
      ctx.beginPath();
      ctx.moveTo(-13, -17);
      ctx.lineTo(-8, -28);
      ctx.lineTo(-3, -18);
      ctx.lineTo(3, -28);
      ctx.lineTo(10, -17);
      ctx.lineTo(15, -2);
      ctx.lineTo(10, 16);
      ctx.lineTo(-10, 16);
      ctx.lineTo(-15, -2);
      ctx.closePath();
      ctx.fill();

      ctx.fillStyle = flash ? '#fff0d8' : this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 13, 15, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#2a1515';
      ctx.beginPath();
      ctx.arc(-4, -4, 4, 0, Math.PI * 2);
      ctx.arc(4, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f4d47a';
      ctx.fillRect(-5, -5, 2, 2);
      ctx.fillRect(3, -5, 2, 2);

      ctx.fillStyle = '#38191b';
      ctx.beginPath();
      ctx.ellipse(0, 7, 6, 4, 0, 0, Math.PI);
      ctx.fill();
      ctx.fillStyle = COLORS.bone;
      ctx.fillRect(-4, 7, 2, 3);
      ctx.fillRect(2, 7, 2, 3);
    }

    drawShooter(ctx, flash) {
      ctx.fillStyle = flash ? '#f1ddc4' : '#372726';
      ctx.beginPath();
      ctx.moveTo(-15, 14);
      ctx.lineTo(-12, -15);
      ctx.quadraticCurveTo(0, -29, 12, -15);
      ctx.lineTo(15, 14);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = flash ? '#fff3df' : this.color;
      ctx.beginPath();
      ctx.arc(0, -8, 11, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-10, -8, 20, 8);
      ctx.fillStyle = '#221619';
      ctx.fillRect(-8, -8, 16, 5);
      ctx.fillStyle = '#e4624d';
      ctx.fillRect(-6, -7, 3, 2);
      ctx.fillRect(3, -7, 3, 2);
      ctx.fillStyle = '#49302b';
      ctx.fillRect(-9, 9, 18, 3);
      ctx.fillStyle = '#a88a68';
      ctx.fillRect(-6, 1, 12, 10);
    }

    drawJumper(ctx, flash) {
      const squash = this.dashTimer > 0 ? 1.22 : 1;
      ctx.scale(squash, 1 / squash);
      ctx.fillStyle = flash ? '#fff1da' : '#421c35';
      ctx.beginPath();
      ctx.ellipse(0, 1, 14, 13, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = flash ? '#ffe5cd' : this.color;
      ctx.beginPath();
      ctx.moveTo(-14, 2);
      ctx.quadraticCurveTo(-10, -16, 0, -13);
      ctx.quadraticCurveTo(10, -16, 14, 2);
      ctx.quadraticCurveTo(8, 13, 0, 12);
      ctx.quadraticCurveTo(-8, 13, -14, 2);
      ctx.fill();
      ctx.fillStyle = '#1b1117';
      ctx.fillRect(-10, -4, 20, 5);
      ctx.fillStyle = '#ffcc64';
      ctx.fillRect(-6, -3, 3, 2);
      ctx.fillRect(3, -3, 3, 2);
      ctx.fillStyle = '#2b1626';
      ctx.beginPath();
      ctx.arc(-10, 12, 5, 0, Math.PI * 2);
      ctx.arc(10, 12, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ---------------------------------------------------------------------------
  // Chefe — dois padrões alternados: rajada radial e investida
  // ---------------------------------------------------------------------------
  class Boss extends Enemy {
    constructor(x, y, floor) {
      super('chaser', x, y, floor);
      this.type = 'boss';
      this.radius = 32;
      this.maxHp = 24 + floor * 8;
      this.hp = this.maxHp;
      this.speed = 45 + floor * 3;
      this.contactDamage = 2;
      this.color = '#b24238';
      this.attackPattern = 0;
      this.phase = 'idle';
      this.phaseTimer = rand(0.7, 1.4);
      this.dashX = 0;
      this.dashY = 0;
      this.roarTimer = 2.8;
    }

    update(dt, game) {
      this.anim += dt;
      this.hitFlash = Math.max(0, this.hitFlash - dt);
      this.roarTimer -= dt;
      this.phaseTimer -= dt;

      const player = game.player;
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.hypot(dx, dy) || 1;
      const dir = { x: dx / dist, y: dy / dist };

      if (this.phase === 'idle') {
        if (dist > 190) {
          this.move(this.x + dir.x * this.speed * dt, this.y + dir.y * this.speed * dt, game);
        } else if (Math.random() < 0.015) {
          this.move(this.x - dir.x * 35 * dt, this.y - dir.y * 35 * dt, game);
        }
        if (this.phaseTimer <= 0) {
          this.phase = 'telegraph';
          this.phaseTimer = this.attackPattern === 0 ? 0.72 : 0.58;
          if (this.attackPattern === 1) {
            this.dashX = dir.x;
            this.dashY = dir.y;
          }
          game.audio.boss();
        }
      } else if (this.phase === 'telegraph') {
        // Recuo curto para dar espaço ao jogador ler o ataque.
        this.move(this.x - dir.x * 18 * dt, this.y - dir.y * 18 * dt, game);
        if (this.phaseTimer <= 0) {
          if (this.attackPattern === 0) this.fireRadial(game);
          else {
            this.phase = 'dash';
            this.phaseTimer = 0.62;
            game.shake = Math.max(game.shake, 4);
          }
        }
      } else if (this.phase === 'dash') {
        this.move(this.x + this.dashX * 340 * dt, this.y + this.dashY * 340 * dt, game);
        game.spawnParticle(this.x, this.y + 20, rand(-25, 25), rand(-10, 18), '#6a4238', rand(2, 5), 0.28);
        if (this.phaseTimer <= 0) {
          this.phase = 'idle';
          this.phaseTimer = 2.1;
          this.attackPattern = 0;
        }
      }

      if (this.phase === 'idle') {
        this.phaseTimer -= 0;
      }
      if (this.phase === 'idle' && this.phaseTimer <= 0) {
        this.attackPattern = this.attackPattern === 0 ? 1 : 0;
      }
    }

    fireRadial(game) {
      const count = 10 + this.floor * 2;
      const offset = Math.random() * Math.PI * 2;
      for (let i = 0; i < count; i++) {
        const angle = offset + (Math.PI * 2 * i) / count;
        game.projectiles.push(new Projectile({
          x: this.x + Math.cos(angle) * (this.radius + 5),
          y: this.y + Math.sin(angle) * (this.radius + 5),
          vx: Math.cos(angle) * (150 + this.floor * 12),
          vy: Math.sin(angle) * (150 + this.floor * 12),
          radius: 6,
          damage: 1,
          range: 620,
          owner: 'enemy',
          color: '#e05a45',
        }));
      }
      for (let i = 0; i < 18; i++) {
        game.spawnParticle(this.x, this.y, rand(-170, 170), rand(-170, 170), i % 2 ? '#d34b40' : '#e8d4b7', rand(2, 5), rand(0.25, 0.55));
      }
      game.shake = Math.max(game.shake, 6);
      this.phase = 'idle';
      this.phaseTimer = 2.25;
      this.attackPattern = 1;
    }

    draw(ctx, game) {
      const bounce = this.phase === 'dash' ? 4 : Math.abs(Math.sin(this.anim * 2.2)) * 3;
      ctx.save();
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(this.x, this.y + this.radius + 10, 40, 13, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.translate(this.x, this.y - bounce);
      const telegraph = this.phase === 'telegraph' ? Math.sin(this.anim * 30) * 0.08 : 0;
      ctx.scale(1 + telegraph, 1 - telegraph);
      const flash = this.hitFlash > 0;

      // Pernas e corpo grotesco.
      ctx.fillStyle = '#34191b';
      ctx.beginPath();
      ctx.ellipse(-21, 30, 12, 8, 0.2, 0, Math.PI * 2);
      ctx.ellipse(21, 30, 12, 8, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = flash ? '#ffe9ce' : '#5d2827';
      ctx.beginPath();
      ctx.ellipse(0, 8, 33, 35, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = flash ? '#fff0d8' : '#a83e35';
      ctx.beginPath();
      ctx.moveTo(-32, -12);
      ctx.lineTo(-48, -42);
      ctx.lineTo(-21, -29);
      ctx.lineTo(0, -38);
      ctx.lineTo(21, -29);
      ctx.lineTo(48, -42);
      ctx.lineTo(32, -12);
      ctx.quadraticCurveTo(0, -27, -32, -12);
      ctx.fill();

      // Chifres ósseos.
      ctx.fillStyle = COLORS.bone;
      ctx.beginPath();
      ctx.moveTo(-24, -27);
      ctx.lineTo(-43, -57);
      ctx.lineTo(-38, -26);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(24, -27);
      ctx.lineTo(43, -57);
      ctx.lineTo(38, -26);
      ctx.fill();

      // Rosto.
      ctx.fillStyle = '#2b1719';
      ctx.beginPath();
      ctx.ellipse(0, -8, 20, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      const glow = this.phase === 'telegraph' ? '#fff1a3' : '#f0c34d';
      ctx.fillStyle = glow;
      ctx.fillRect(-12, -13, 7, 4);
      ctx.fillRect(5, -13, 7, 4);
      ctx.fillStyle = '#150d0e';
      ctx.fillRect(-10, -3, 20, 10);
      ctx.fillStyle = COLORS.bone;
      for (let i = -8; i <= 8; i += 5) ctx.fillRect(i, -3, 2, 5);

      // Costelas e coração pulsante.
      ctx.strokeStyle = '#35181a';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.arc(0, 14 + i * 6, 20 - i * 3, 0.05, Math.PI - 0.05);
        ctx.stroke();
      }
      ctx.fillStyle = this.phase === 'telegraph' ? '#ff715f' : '#8e2c2d';
      ctx.beginPath();
      ctx.arc(0, 18, 5 + Math.sin(this.anim * 8) * 1.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ---------------------------------------------------------------------------
  // Salas e geração de conteúdo
  // ---------------------------------------------------------------------------
  class Room {
    constructor(key, gridX, gridY, type = 'normal') {
      this.key = key;
      this.gridX = gridX;
      this.gridY = gridY;
      this.type = type;
      this.connections = new Map();
      this.visited = false;
      this.generated = false;
      this.cleared = false;
      this.enemies = [];
      this.obstacles = [];
      this.drops = [];
      this.treasure = null;
      this.treasureTaken = false;
      this.hatch = null;
    }

    get aliveEnemies() {
      return this.enemies.filter((enemy) => enemy.hp > 0);
    }

    generate(game) {
      if (this.generated) return;
      this.generated = true;
      const floor = game.floor;
      this.createObstacles(floor);

      if (this.type === 'normal') {
        const count = Math.min(7, 2 + floor + randInt(0, 2));
        const forcedTypes = ['chaser', 'shooter', 'jumper'];
        for (let i = 0; i < count; i++) {
          const type = i < forcedTypes.length ? forcedTypes[i] : choice(['chaser', 'chaser', 'shooter', 'jumper']);
          const point = this.findSpawnPoint(i);
          this.enemies.push(new Enemy(type, point.x, point.y, floor));
        }
      } else if (this.type === 'boss') {
        this.enemies.push(new Boss(ROOM.cx, ROOM.cy - 35, floor));
      } else if (this.type === 'treasure') {
        const available = PASSIVE_ITEMS.filter((item) => !game.player.items.some((owned) => owned.id === item.id));
        this.treasure = { ...choice(available.length ? available : PASSIVE_ITEMS) };
      }
    }

    createObstacles(floor) {
      if (this.type === 'treasure') return;
      const rockCount = this.type === 'boss' ? 0 : randInt(0, 2 + (floor > 2 ? 1 : 0));
      const spikeCount = this.type === 'boss' ? 0 : (Math.random() < 0.62 ? randInt(1, 2) : 0);
      for (let i = 0; i < rockCount; i++) this.addObstacle('rock');
      for (let i = 0; i < spikeCount; i++) this.addObstacle('spike');
    }

    addObstacle(type) {
      for (let attempt = 0; attempt < 45; attempt++) {
        const w = type === 'rock' ? rand(42, 66) : rand(34, 46);
        const h = type === 'rock' ? rand(32, 48) : rand(24, 32);
        const x = rand(ROOM.left + 76, ROOM.right - 76 - w);
        const y = rand(ROOM.top + 84, ROOM.bottom - 84 - h);
        const centerDistance = distance(x + w / 2, y + h / 2, ROOM.cx, ROOM.cy);
        if (centerDistance < (type === 'rock' ? 125 : 100)) continue;
        if (Math.abs(x + w / 2 - ROOM.cx) < 78) continue;
        if (Math.abs(y + h / 2 - ROOM.cy) < 68) continue;

        const overlaps = this.obstacles.some((other) =>
          x < other.x + other.w + 24 && x + w + 24 > other.x && y < other.y + other.h + 24 && y + h + 24 > other.y
        );
        if (overlaps) continue;
        this.obstacles.push({ type, x, y, w, h, seed: Math.random() * 999 });
        return;
      }
    }

    findSpawnPoint(index = 0) {
      for (let attempt = 0; attempt < 90; attempt++) {
        const x = rand(ROOM.left + 58, ROOM.right - 58);
        const y = rand(ROOM.top + 58, ROOM.bottom - 58);
        if (distance(x, y, ROOM.cx, ROOM.cy) < 88) continue;
        if (this.obstacles.some((obstacle) => circleRect(x, y, 27, obstacle))) continue;
        if (this.enemies.some((enemy) => distance(x, y, enemy.x, enemy.y) < 54)) continue;
        return { x, y };
      }
      const angle = (index / 5) * Math.PI * 2;
      return { x: ROOM.cx + Math.cos(angle) * 240, y: ROOM.cy + Math.sin(angle) * 170 };
    }

    hasConnection(dir) {
      return this.connections.has(dir);
    }

    doorIsOpen() {
      return this.aliveEnemies.length === 0;
    }

    addDrop(type, x, y) {
      this.drops.push({
        type,
        x: clamp(x, ROOM.left + 30, ROOM.right - 30),
        y: clamp(y, ROOM.top + 30, ROOM.bottom - 30),
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Jogo principal
  // ---------------------------------------------------------------------------
  class Game {
    constructor() {
      this.canvas = document.getElementById('gameCanvas');
      this.ctx = this.canvas.getContext('2d');
      this.ctx.imageSmoothingEnabled = false;
      this.audio = new AudioManager();
      this.keys = new Set();
      this.state = 'select';
      this.selectedCharacter = 0;
      this.arrowMode = 'shoot';
      this.floor = 1;
      this.rooms = new Map();
      this.currentRoom = null;
      this.player = null;
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.bombs = [];
      this.shake = 0;
      this.damageFlash = 0;
      this.toastText = '';
      this.toastTimer = 0;
      this.victoryDelay = 0;
      this.elapsed = 0;
      this.lastTime = performance.now();
      this.overlayMode = null;
      this.arrowTogglePulse = 0;
      this.musicNoticeUntil = 0;
      this.characterSprites = [];

      this.overlay = document.getElementById('overlay');
      this.overlayTitle = document.getElementById('overlay-title');
      this.overlayText = document.getElementById('overlay-text');
      this.primaryButton = document.getElementById('btn-primary');
      this.secondaryButton = document.getElementById('btn-secondary');
      this.overlayAudioButton = document.getElementById('btn-audio');

      this.audioOverlay = document.getElementById('audio-overlay');
      this.musicToggleButton = document.getElementById('toggle-music');
      this.sfxToggleButton = document.getElementById('toggle-sfx');
      this.audioCloseButton = document.getElementById('audio-close');
      this.openAudioButton = document.getElementById('open-audio');
      this.audioPanelReturn = null;

      this.menuDust = Array.from({ length: 38 }, () => ({
        x: Math.random() * WIDTH,
        y: Math.random() * HEIGHT,
        r: rand(1, 3),
        speed: rand(4, 15),
        alpha: rand(0.1, 0.45),
      }));

      this.loadSprites();
      this.bindEvents();
      this.resizeCanvas();
      requestAnimationFrame((time) => this.loop(time));
    }

    loadSprites() {
      // Sprites opcionais: se os PNGs não existirem, o desenho vetorial é usado.
      CHARACTERS.forEach((character, index) => {
        const image = new Image();
        image.ready = false;
        image.onload = () => { image.ready = true; };
        image.onerror = () => { image.ready = false; };
        image.src = `assets/personagem${index + 1}.png`;
        this.characterSprites.push(image);
      });
    }

    bindEvents() {
      window.addEventListener('keydown', (event) => this.onKeyDown(event));
      window.addEventListener('keyup', (event) => {
        this.keys.delete(event.code);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
      });
      window.addEventListener('blur', () => {
        this.keys.clear();
        if (this.state === 'play') this.pause();
      });
      this.canvas.addEventListener('pointerdown', () => {
        this.audio.unlock();
        this.canvas.focus();
      });
      this.primaryButton.addEventListener('click', () => {
        this.audio.unlock();
        this.handleOverlayPrimary();
      });
      this.secondaryButton.addEventListener('click', () => {
        this.audio.unlock();
        this.handleOverlaySecondary();
      });
      this.overlayAudioButton.addEventListener('click', () => {
        this.audio.unlock();
        this.openAudioSettings();
      });
      this.openAudioButton.addEventListener('click', () => {
        this.audio.unlock();
        this.openAudioSettings();
      });
      this.audioCloseButton.addEventListener('click', () => this.closeAudioSettings());
      this.musicToggleButton.addEventListener('click', () => {
        this.audio.unlock();
        this.toggleMusicSound(false);
      });
      this.sfxToggleButton.addEventListener('click', () => {
        this.audio.unlock();
        this.toggleSfxSound(false);
      });
      this.audioOverlay.addEventListener('click', (event) => {
        if (event.target === this.audioOverlay) this.closeAudioSettings();
      });
      window.addEventListener('resize', () => this.resizeCanvas());
      this.updateAudioControls();
    }

    resizeCanvas() {
      // O canvas interno é fixo; o CSS mantém a proporção 3:2.
      this.canvas.width = WIDTH;
      this.canvas.height = HEIGHT;
      this.ctx.imageSmoothingEnabled = false;
    }

    onKeyDown(event) {
      const blocked = [
        'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space',
        'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyI', 'KeyJ', 'KeyK', 'KeyL',
      ];
      if (blocked.includes(event.code)) event.preventDefault();
      this.audio.unlock();

      if (event.repeat && ['Enter', 'Escape', 'Space', 'KeyQ', 'KeyC', 'KeyM', 'KeyN', 'KeyO'].includes(event.code)) return;

      // O menu de áudio captura as teclas enquanto estiver aberto.
      if (!this.audioOverlay.hidden) {
        if (event.code === 'Escape' || event.code === 'KeyO') this.closeAudioSettings();
        else if (event.code === 'KeyM') this.toggleMusicSound();
        else if (event.code === 'KeyN') this.toggleSfxSound();
        return;
      }

      if (event.code === 'KeyO') {
        this.openAudioSettings();
        return;
      }

      if (event.code === 'KeyM') {
        this.toggleMusicSound();
        return;
      }

      if (event.code === 'KeyN') {
        this.toggleSfxSound();
        return;
      }

      if (this.state === 'select') {
        if (['ArrowLeft', 'KeyA'].includes(event.code)) {
          this.selectedCharacter = (this.selectedCharacter + CHARACTERS.length - 1) % CHARACTERS.length;
          this.audio.tone(320, 0.05, 'square', 0.18, 50);
        } else if (['ArrowRight', 'KeyD'].includes(event.code)) {
          this.selectedCharacter = (this.selectedCharacter + 1) % CHARACTERS.length;
          this.audio.tone(320, 0.05, 'square', 0.18, 50);
        } else if (['Enter', 'Space'].includes(event.code)) {
          this.startRun(this.selectedCharacter);
        } else if (event.code === 'KeyC') {
          this.toggleArrowMode();
        }
        return;
      }

      if (this.state === 'pause') {
        if (event.code === 'Escape' || event.code === 'Enter') this.resume();
        return;
      }

      if (this.state === 'gameover' || this.state === 'victory') {
        if (event.code === 'Enter') this.startRun(this.selectedCharacter);
        if (event.code === 'Escape') this.showMenu();
        return;
      }

      if (this.state !== 'play') return;

      if (event.code === 'Escape') {
        this.pause();
        return;
      }
      if (event.code === 'KeyC') {
        this.toggleArrowMode();
        return;
      }

      this.keys.add(event.code);
      if (event.code === 'Space' || event.code === 'KeyQ') this.dropBomb();
    }

    toggleArrowMode() {
      this.arrowMode = this.arrowMode === 'shoot' ? 'move' : 'shoot';
      this.arrowTogglePulse = 1;
      this.audio.tone(this.arrowMode === 'shoot' ? 480 : 340, 0.09, 'square', 0.2, 60);
      if (this.state === 'play') {
        this.toast(this.arrowMode === 'shoot' ? 'SETAS: ATIRAR' : 'SETAS: MOVER', COLORS.bone);
      }
    }

    startRun(characterIndex) {
      this.selectedCharacter = characterIndex;
      this.state = 'play';
      this.floor = 1;
      this.player = new Player(CHARACTERS[characterIndex], ROOM.cx, ROOM.cy);
      this.projectiles = [];
      this.particles = [];
      this.floatingTexts = [];
      this.bombs = [];
      this.shake = 0;
      this.damageFlash = 0;
      this.victoryDelay = 0;
      this.keys.clear();
      this.hideOverlay();
      this.audio.unlock();
      this.audio.tone(260, 0.1, 'triangle', 0.24, 120);
      this.buildFloor();
      this.toast(`ANDAR ${this.floor} — ${CHARACTERS[characterIndex].name}`, COLORS.gold);
      this.canvas.focus();
    }

    buildFloor() {
      this.rooms = new Map();
      this.projectiles = [];
      this.bombs = [];
      const targetCount = randInt(8, 10);
      const startX = 1;
      const startY = 1;
      const startKey = `${startX},${startY}`;
      const start = new Room(startKey, startX, startY, 'start');
      this.rooms.set(startKey, start);

      const frontier = [];
      const addFrontier = (x, y) => {
        if (x >= 0 && x <= 3 && y >= 0 && y <= 3) frontier.push({ x, y });
      };
      DIR_KEYS.forEach((dir) => addFrontier(startX + DIRECTIONS[dir].dx, startY + DIRECTIONS[dir].dy));

      while (this.rooms.size < targetCount && frontier.length) {
        const idx = Math.floor(Math.random() * frontier.length);
        const pos = frontier.splice(idx, 1)[0];
        const key = `${pos.x},${pos.y}`;
        if (this.rooms.has(key)) continue;

        const candidates = DIR_KEYS
          .map((dir) => ({ dir, x: pos.x + DIRECTIONS[dir].dx, y: pos.y + DIRECTIONS[dir].dy }))
          .filter((item) => this.rooms.has(`${item.x},${item.y}`));
        if (!candidates.length) continue;

        const link = choice(candidates);
        const room = new Room(key, pos.x, pos.y, 'normal');
        this.rooms.set(key, room);
        const linkedRoom = this.rooms.get(`${link.x},${link.y}`);
        room.connections.set(link.dir, linkedRoom.key);
        linkedRoom.connections.set(DIRECTIONS[link.dir].opposite, room.key);
        DIR_KEYS.forEach((dir) => addFrontier(pos.x + DIRECTIONS[dir].dx, pos.y + DIRECTIONS[dir].dy));
      }

      // Ligações extras criam atalhos e evitam mapas lineares.
      if (this.rooms.size >= 8) {
        for (const room of this.rooms.values()) {
          for (const dir of DIR_KEYS) {
            if (room.connections.has(dir)) continue;
            const nx = room.gridX + DIRECTIONS[dir].dx;
            const ny = room.gridY + DIRECTIONS[dir].dy;
            const neighbor = this.rooms.get(`${nx},${ny}`);
            if (neighbor && !neighbor.connections.has(DIRECTIONS[dir].opposite) && Math.random() < 0.16) {
              room.connections.set(dir, neighbor.key);
              neighbor.connections.set(DIRECTIONS[dir].opposite, room.key);
            }
          }
        }
      }

      // A sala mais distante da entrada vira a sala do chefe.
      const distances = new Map([[startKey, 0]]);
      const queue = [startKey];
      while (queue.length) {
        const currentKey = queue.shift();
        const room = this.rooms.get(currentKey);
        for (const neighborKey of room.connections.values()) {
          if (!distances.has(neighborKey)) {
            distances.set(neighborKey, distances.get(currentKey) + 1);
            queue.push(neighborKey);
          }
        }
      }

      const sorted = [...this.rooms.keys()].sort((a, b) => (distances.get(b) || 0) - (distances.get(a) || 0));
      const bossKey = sorted[0];
      this.rooms.get(bossKey).type = 'boss';

      const treasureCandidates = sorted.filter((key) => {
        const room = this.rooms.get(key);
        return key !== startKey && key !== bossKey && room.type === 'normal' && (distances.get(key) || 0) >= 1;
      });
      const treasureKey = treasureCandidates.length ? choice(treasureCandidates) : sorted.find((key) => key !== startKey && key !== bossKey);
      if (treasureKey) this.rooms.get(treasureKey).type = 'treasure';

      this.enterRoom(startKey, null, true);
    }

    enterRoom(key, fromDir, initial = false) {
      const room = this.rooms.get(key);
      if (!room) return;
      const firstVisit = !room.visited;
      this.currentRoom = room;
      this.audio.setMusicMode(room.type === 'boss' ? 'boss' : 'dungeon');
      room.visited = true;
      room.generate(this);
      this.projectiles = [];
      this.bombs = [];
      this.particles = [];

      const p = this.player;
      if (fromDir === 'n') {
        p.x = ROOM.cx;
        p.y = ROOM.bottom - p.radius - 38;
      } else if (fromDir === 's') {
        p.x = ROOM.cx;
        p.y = ROOM.top + p.radius + 38;
      } else if (fromDir === 'e') {
        p.x = ROOM.left + p.radius + 38;
        p.y = ROOM.cy;
      } else if (fromDir === 'w') {
        p.x = ROOM.right - p.radius - 38;
        p.y = ROOM.cy;
      } else {
        p.x = ROOM.cx;
        p.y = ROOM.cy;
      }
      p.vx = 0;
      p.vy = 0;

      if (!initial) {
        this.audio.door();
        if (room.type === 'boss') {
          this.audio.boss();
          this.toast('O CHEFE DESPERTA', COLORS.red);
        } else if (room.type === 'treasure' && firstVisit) {
          this.toast('SALA DO TESOURO', COLORS.gold);
        } else if (firstVisit) {
          this.toast('NOVA SALA', COLORS.boneDark);
        }
      }
    }

    // -------------------------------------------------------------------------
    // Menu de áudio
    // -------------------------------------------------------------------------
    openAudioSettings() {
      if (!this.audioOverlay.hidden) return;
      this.audioPanelReturn = {
        state: this.state,
        overlayHidden: this.overlay.hidden,
      };
      if (this.state === 'play') this.state = 'pause';
      this.overlay.hidden = true;
      this.audioOverlay.hidden = false;
      this.keys.clear();
      this.audio.unlock();
      this.updateAudioControls();
      this.musicToggleButton.focus({ preventScroll: true });
    }

    closeAudioSettings() {
      if (this.audioOverlay.hidden) return;
      const previous = this.audioPanelReturn || { state: this.state, overlayHidden: true };
      this.audioOverlay.hidden = true;
      this.audioPanelReturn = null;
      this.state = previous.state;
      this.overlay.hidden = previous.overlayHidden;
      if (previous.state === 'play') this.lastTime = performance.now();
      this.canvas.focus({ preventScroll: true });
    }

    updateAudioControls() {
      const musicOn = this.audio.musicEnabled;
      const sfxOn = this.audio.sfxEnabled;
      this.musicToggleButton.textContent = `Música: ${musicOn ? 'Ligada' : 'Desligada'}`;
      this.musicToggleButton.setAttribute('aria-pressed', String(musicOn));
      this.sfxToggleButton.textContent = `Efeitos: ${sfxOn ? 'Ligados' : 'Desligados'}`;
      this.sfxToggleButton.setAttribute('aria-pressed', String(sfxOn));
    }

    toggleMusicSound(showFeedback = true) {
      const enabled = this.audio.toggleMusic();
      this.updateAudioControls();
      this.musicNoticeUntil = this.elapsed + 1.8;
      this.audio.tone(enabled ? 660 : 220, 0.08, 'square', 0.2, enabled ? 80 : -30);
      if (showFeedback && this.state === 'play') {
        this.toast(enabled ? 'MÚSICA: LIGADA' : 'MÚSICA: DESLIGADA', enabled ? COLORS.gold : COLORS.boneDark);
      }
      return enabled;
    }

    toggleSfxSound(showFeedback = true) {
      const enabled = this.audio.toggleSfx();
      this.updateAudioControls();
      if (enabled) this.audio.tone(620, 0.08, 'square', 0.2, 70);
      if (showFeedback && this.state === 'play') {
        this.toast(enabled ? 'EFEITOS: LIGADOS' : 'EFEITOS: DESLIGADOS', enabled ? COLORS.gold : COLORS.boneDark);
      }
      return enabled;
    }

    // -------------------------------------------------------------------------
    // Entrada e loop principal
    // -------------------------------------------------------------------------
    pause() {
      if (this.state !== 'play') return;
      this.state = 'pause';
      this.keys.clear();
      this.showOverlay('pause', 'PAUSA', 'Respire fundo. As portas só abrem quando a sala estiver limpa.', 'Continuar', 'Escolher personagem');
    }

    resume() {
      if (this.state !== 'pause') return;
      this.state = 'play';
      this.hideOverlay();
      this.lastTime = performance.now();
      this.canvas.focus();
    }

    showMenu() {
      this.state = 'select';
      this.hideOverlay();
      this.keys.clear();
      this.audio.setMusicMode('dungeon');
      this.audio.tone(280, 0.1, 'triangle', 0.2, 40);
    }

    gameOver() {
      if (this.state !== 'play') return;
      this.state = 'gameover';
      this.keys.clear();
      this.shake = 12;
      this.audio.setMusicMode('dungeon');
      this.audio.damage();
      this.showOverlay('gameover', 'VOCÊ CAIU', `Chegou ao andar ${this.floor} com ${this.player.coins} moedas. A escuridão espera por outra tentativa.`, 'Tentar de novo', 'Escolher personagem');
    }

    showVictory() {
      if (this.state === 'victory') return;
      this.state = 'victory';
      this.keys.clear();
      this.audio.setMusicMode('dungeon');
      this.audio.victory();
      this.showOverlay('victory', 'VITÓRIA', `Os três andares foram purgados. Moedas: ${this.player.coins} • Bombas: ${this.player.bombs} • Itens: ${this.player.items.length}`, 'Jogar novamente', 'Escolher personagem');
    }

    showOverlay(mode, title, text, primary, secondary) {
      this.overlayMode = mode;
      this.overlayTitle.textContent = title;
      this.overlayText.textContent = text;
      this.primaryButton.textContent = primary;
      this.secondaryButton.textContent = secondary;
      this.overlay.hidden = false;
    }

    hideOverlay() {
      this.overlay.hidden = true;
      this.overlayMode = null;
    }

    handleOverlayPrimary() {
      if (this.overlayMode === 'pause') this.resume();
      else if (this.overlayMode === 'gameover' || this.overlayMode === 'victory') this.startRun(this.selectedCharacter);
    }

    handleOverlaySecondary() {
      if (this.overlayMode === 'pause') this.showMenu();
      else if (this.overlayMode === 'gameover' || this.overlayMode === 'victory') this.showMenu();
    }

    // -------------------------------------------------------------------------
    // Atualização do jogo
    // -------------------------------------------------------------------------
    update(dt) {
      if (this.victoryDelay > 0) {
        this.victoryDelay -= dt;
        this.updateEffects(dt);
        if (this.victoryDelay <= 0) this.showVictory();
        return;
      }

      this.player.update(dt, this);
      if (this.handleDoors()) return;

      for (const enemy of [...this.currentRoom.enemies]) {
        if (enemy.hp > 0) enemy.update(dt, this);
      }

      this.updateProjectiles(dt);
      this.updateBombs(dt);
      this.updateHazards();
      this.updatePickups();
      this.updateHatch();

      // Dano por contato entre jogador e inimigos.
      for (const enemy of this.currentRoom.enemies) {
        if (enemy.hp <= 0) continue;
        if (circlesOverlap(this.player.x, this.player.y, this.player.radius, enemy.x, enemy.y, enemy.radius)) {
          this.player.takeDamage(enemy.contactDamage, this, enemy.x, enemy.y);
          break;
        }
      }

      this.updateEffects(dt);
      if (this.player.health <= 0) this.gameOver();
    }

    moveEntity(entity, dx, dy) {
      entity.x += dx;
      for (const obstacle of this.currentRoom.obstacles) {
        if (obstacle.type === 'rock') resolveCircleRect(entity, obstacle);
      }
      entity.y += dy;
      for (const obstacle of this.currentRoom.obstacles) {
        if (obstacle.type === 'rock') resolveCircleRect(entity, obstacle);
      }
      entity.x = clamp(entity.x, ROOM.left + entity.radius, ROOM.right - entity.radius);
      entity.y = clamp(entity.y, ROOM.top + entity.radius, ROOM.bottom - entity.radius);
    }

    handleDoors() {
      const room = this.currentRoom;
      const p = this.player;
      if (!room || !room.doorIsOpen()) return false;
      const atX = Math.abs(p.x - ROOM.cx) < DOOR_HALF - 2;
      const atY = Math.abs(p.y - ROOM.cy) < DOOR_HALF - 2;

      if (atX && p.y <= ROOM.top + p.radius + 2.5 && room.connections.has('n')) {
        this.enterRoom(room.connections.get('n'), 'n');
        return true;
      }
      if (atX && p.y >= ROOM.bottom - p.radius - 2.5 && room.connections.has('s')) {
        this.enterRoom(room.connections.get('s'), 's');
        return true;
      }
      if (atY && p.x >= ROOM.right - p.radius - 2.5 && room.connections.has('e')) {
        this.enterRoom(room.connections.get('e'), 'e');
        return true;
      }
      if (atY && p.x <= ROOM.left + p.radius + 2.5 && room.connections.has('w')) {
        this.enterRoom(room.connections.get('w'), 'w');
        return true;
      }
      return false;
    }

    updateProjectiles(dt) {
      for (const projectile of this.projectiles) {
        if (projectile.dead) continue;
        projectile.update(dt, this);
        if (projectile.dead) continue;

        if (projectile.owner === 'player') {
          for (const enemy of this.currentRoom.enemies) {
            if (enemy.hp <= 0) continue;
            if (circlesOverlap(projectile.x, projectile.y, projectile.radius, enemy.x, enemy.y, enemy.radius)) {
              this.damageEnemy(enemy, projectile.damage);
              projectile.dead = true;
              break;
            }
          }
        } else {
          if (circlesOverlap(projectile.x, projectile.y, projectile.radius, this.player.x, this.player.y, this.player.radius)) {
            this.player.takeDamage(projectile.damage, this, projectile.x, projectile.y);
            projectile.dead = true;
            for (let i = 0; i < 5; i++) {
              this.spawnParticle(projectile.x, projectile.y, rand(-70, 70), rand(-70, 70), COLORS.red, rand(1, 3), 0.25);
            }
          }
        }
      }
      this.projectiles = this.projectiles.filter((projectile) => !projectile.dead);
    }

    damageEnemy(enemy, amount) {
      if (enemy.hp <= 0) return;
      enemy.takeDamage(amount, this);
      this.floatingTexts.push({
        text: amount.toFixed(1).replace('.', ','),
        x: enemy.x,
        y: enemy.y - enemy.radius - 6,
        life: 0.65,
        maxLife: 0.65,
        color: COLORS.bone,
      });
      this.shake = Math.max(this.shake, 2.2);
      if (enemy.hp > 0) return;

      const index = this.currentRoom.enemies.indexOf(enemy);
      if (index >= 0) this.currentRoom.enemies.splice(index, 1);

      if (enemy.type === 'boss') {
        this.onBossDefeated(this.currentRoom);
      } else if (this.currentRoom.aliveEnemies.length === 0) {
        this.clearRoom(this.currentRoom);
      }
    }

    clearRoom(room) {
      if (room.cleared) return;
      room.cleared = true;
      this.audio.door();
      this.toast('SALA LIMPA — PORTAS ABERTAS', COLORS.gold);
      const roll = Math.random();
      const type = roll < 0.34 ? 'heart' : roll < 0.72 ? 'coin' : 'bomb';
      room.addDrop(type, room.cleared ? ROOM.cx + rand(-45, 45) : room.cx, ROOM.cy + rand(-25, 25));
      if (Math.random() < 0.5) {
        room.addDrop(Math.random() < 0.65 ? 'coin' : 'bomb', ROOM.cx + rand(-70, 70), ROOM.cy + rand(-50, 50));
      }
      for (let i = 0; i < 10; i++) {
        this.spawnParticle(ROOM.cx + rand(-80, 80), ROOM.cy + rand(-50, 50), rand(-20, 20), rand(-65, -18), COLORS.gold, rand(1, 3), rand(0.4, 0.8));
      }
    }

    onBossDefeated(room) {
      room.cleared = true;
      this.audio.setMusicMode('dungeon');
      room.addDrop('heart', ROOM.cx, ROOM.cy + 65);
      room.addDrop('coin', ROOM.cx - 50, ROOM.cy + 55);
      for (let i = 0; i < 3; i++) room.addDrop('coin', ROOM.cx + rand(-75, 75), ROOM.cy + rand(40, 95));
      this.audio.boss();
      this.audio.door();
      this.shake = 12;
      for (let i = 0; i < 34; i++) {
        this.spawnParticle(ROOM.cx, ROOM.cy, rand(-220, 220), rand(-220, 220), i % 3 === 0 ? COLORS.gold : '#a83e35', rand(2, 6), rand(0.45, 1));
      }

      if (this.floor >= MAX_FLOORS) {
        this.victoryDelay = 1.55;
        this.toast('O ÚLTIMO CHEFE CAIU', COLORS.gold);
      } else {
        room.hatch = { x: ROOM.cx, y: ROOM.cy + 20, active: true };
        this.toast('CHEFE DERROTADO — ALÇAPÃO ABERTO', COLORS.gold);
      }
    }

    dropBomb() {
      if (!this.player || this.player.health <= 0) return;
      if (this.player.bombs <= 0) {
        this.toast('SEM BOMBAS', COLORS.red);
        this.audio.tone(110, 0.08, 'square', 0.15, -20);
        return;
      }
      if (this.player.bombCooldown > 0) return;
      this.player.bombs--;
      this.player.bombCooldown = 0.5;
      this.bombs.push({
        x: this.player.x,
        y: this.player.y + 8,
        timer: 0.68,
        maxTimer: 0.68,
      });
      this.audio.tone(210, 0.08, 'triangle', 0.2, 70);
    }

    updateBombs(dt) {
      for (let i = this.bombs.length - 1; i >= 0; i--) {
        const bomb = this.bombs[i];
        bomb.timer -= dt;
        if (bomb.timer > 0) continue;
        this.bombs.splice(i, 1);
        this.audio.bomb();
        this.shake = Math.max(this.shake, 10);
        for (let j = 0; j < 32; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = rand(35, 260);
          this.spawnParticle(bomb.x, bomb.y, Math.cos(angle) * speed, Math.sin(angle) * speed, j % 4 === 0 ? '#ffd36b' : j % 3 === 0 ? '#8d2923' : '#d8b88c', rand(2, 7), rand(0.3, 0.8));
        }
        for (const enemy of [...this.currentRoom.enemies]) {
          if (distance(bomb.x, bomb.y, enemy.x, enemy.y) < 118 + enemy.radius) {
            this.damageEnemy(enemy, 4.2 + this.floor * 0.5);
          }
        }
      }
    }

    spawnEnemyProjectile(x, y, dx, dy, speed, damage) {
      const dir = normalize(dx, dy);
      this.projectiles.push(new Projectile({
        x,
        y,
        vx: dir.x * speed,
        vy: dir.y * speed,
        radius: 6,
        damage,
        range: 560,
        owner: 'enemy',
        color: COLORS.red,
      }));
    }

    updateHazards() {
      for (const obstacle of this.currentRoom.obstacles) {
        if (obstacle.type !== 'spike') continue;
        if (circleRect(this.player.x, this.player.y, this.player.radius - 3, obstacle)) {
          this.player.takeDamage(1, this, obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h / 2);
        }
      }
    }

    updatePickups() {
      const room = this.currentRoom;
      const p = this.player;
      for (let i = room.drops.length - 1; i >= 0; i--) {
        const drop = room.drops[i];
        if (distance(p.x, p.y, drop.x, drop.y) > p.radius + 17) continue;
        if (drop.type === 'heart' && p.health >= p.maxHealth) {
          if (this.toastTimer <= 0) this.toast('VIDA CHEIA', COLORS.boneDark);
          continue;
        }

        room.drops.splice(i, 1);
        if (drop.type === 'heart') {
          p.heal(2);
          this.audio.heal();
          this.floatingText('+1 CORAÇÃO', drop.x, drop.y, COLORS.red);
        } else if (drop.type === 'coin') {
          p.coins++;
          this.audio.pickup();
          this.floatingText('+1 MOEDA', drop.x, drop.y, COLORS.gold);
        } else if (drop.type === 'bomb') {
          p.bombs++;
          this.audio.pickup();
          this.floatingText('+1 BOMBA', drop.x, drop.y, COLORS.bone);
        }
        for (let j = 0; j < 8; j++) {
          this.spawnParticle(drop.x, drop.y, rand(-65, 65), rand(-65, 65), drop.type === 'coin' ? COLORS.gold : drop.type === 'heart' ? COLORS.red : COLORS.bone, rand(1, 3), rand(0.25, 0.55));
        }
      }

      if (room.treasure && !room.treasureTaken) {
        if (distance(p.x, p.y, ROOM.cx, ROOM.cy) < 38) {
          const item = room.treasure;
          room.treasure = null;
          room.treasureTaken = true;
          p.addPassive(item, this);
          this.toast(`${item.name.toUpperCase()} — ${item.desc}`, item.color);
          this.floatingText(item.short, ROOM.cx, ROOM.cy - 35, item.color);
          for (let i = 0; i < 22; i++) {
            this.spawnParticle(ROOM.cx, ROOM.cy - 10, rand(-130, 130), rand(-130, 130), item.color, rand(2, 5), rand(0.35, 0.8));
          }
        }
      }
    }

    updateHatch() {
      const hatch = this.currentRoom.hatch;
      if (!hatch || !hatch.active) return;
      if (distance(this.player.x, this.player.y, hatch.x, hatch.y) < 38) {
        if (this.floor < MAX_FLOORS) this.nextFloor();
        else this.showVictory();
      }
    }

    nextFloor() {
      this.floor++;
      this.player.health = Math.min(this.player.maxHealth, this.player.health + 2);
      this.player.bombs = Math.min(9, this.player.bombs + 1);
      this.projectiles = [];
      this.bombs = [];
      this.particles = [];
      this.floatingTexts = [];
      this.keys.clear();
      this.audio.pickup();
      this.buildFloor();
      this.toast(`ANDAR ${this.floor} — A ESCURIDÃO CRESCE`, COLORS.red);
    }

    updateEffects(dt) {
      this.toastTimer = Math.max(0, this.toastTimer - dt);
      this.damageFlash = Math.max(0, this.damageFlash - dt);
      this.shake *= Math.exp(-10 * dt);
      if (this.shake < 0.03) this.shake = 0;

      for (const particle of this.particles) {
        particle.life -= dt;
        particle.x += particle.vx * dt;
        particle.y += particle.vy * dt;
        particle.vx *= 0.94;
        particle.vy *= 0.94;
        particle.vy += 45 * dt;
      }
      this.particles = this.particles.filter((particle) => particle.life > 0);

      for (const text of this.floatingTexts) {
        text.life -= dt;
        text.y -= 26 * dt;
      }
      this.floatingTexts = this.floatingTexts.filter((text) => text.life > 0);
    }

    spawnParticle(x, y, vx, vy, color, size, life) {
      if (this.particles.length > 320) this.particles.shift();
      this.particles.push({ x, y, vx, vy, color, size, life, maxLife: life });
    }

    floatingText(text, x, y, color) {
      this.floatingTexts.push({ text, x, y, color, life: 0.9, maxLife: 0.9 });
    }

    toast(text, color = COLORS.bone) {
      this.toastText = text;
      this.toastColor = color;
      this.toastTimer = 2.35;
    }

    // -------------------------------------------------------------------------
    // Renderização
    // -------------------------------------------------------------------------
    render() {
      const ctx = this.ctx;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, WIDTH, HEIGHT);

      if (this.state === 'select') {
        this.drawSelection();
      } else if (this.currentRoom && this.player) {
        this.drawWorld();
      } else {
        ctx.fillStyle = COLORS.black;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }
    }

    drawWorld() {
      const ctx = this.ctx;
      ctx.fillStyle = '#0c0809';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      const shakeX = this.state === 'play' && this.shake > 0.1 ? rand(-this.shake, this.shake) : 0;
      const shakeY = this.state === 'play' && this.shake > 0.1 ? rand(-this.shake, this.shake) : 0;
      ctx.save();
      ctx.translate(shakeX, shakeY);

      this.drawRoom();
      this.drawRoomItems();

      for (const bomb of this.bombs) this.drawBomb(bomb);

      const entities = [...this.currentRoom.enemies];
      if (this.player.health > 0 || this.state !== 'gameover') entities.push(this.player);
      entities.sort((a, b) => a.y - b.y);
      for (const entity of entities) entity.draw(ctx, this);

      for (const projectile of this.projectiles) projectile.draw(ctx);
      this.drawParticles();
      this.drawFloatingTexts();
      ctx.restore();

      if (this.damageFlash > 0) {
        ctx.fillStyle = `rgba(155,32,34,${this.damageFlash * 0.44})`;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
      }

      this.drawVignette();
      this.drawHUD();
      this.drawToast();
    }

    drawRoom() {
      const ctx = this.ctx;
      const room = this.currentRoom;

      // Piso em ladrilhos de pedra, com variação determinística por sala/andar.
      ctx.fillStyle = COLORS.floorDark;
      ctx.fillRect(ROOM.left, ROOM.top, ROOM.width, ROOM.height);
      for (let y = ROOM.top; y < ROOM.bottom; y += 32) {
        for (let x = ROOM.left; x < ROOM.right; x += 32) {
          const value = hash01(Math.floor(x / 32), Math.floor(y / 32), this.floor + room.gridX * 13 + room.gridY * 29);
          const palette = ['#563c30', '#5d4133', '#4e372c', '#624638'];
          ctx.fillStyle = palette[Math.floor(value * palette.length)];
          ctx.fillRect(x, y, 31, 31);
          ctx.fillStyle = 'rgba(20,12,10,0.18)';
          ctx.fillRect(x, y + 29, 32, 3);
          ctx.fillRect(x + 29, y, 3, 32);
          if (value > 0.91) {
            ctx.strokeStyle = 'rgba(31,18,15,0.6)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(x + 8, y + 4);
            ctx.lineTo(x + 14, y + 13);
            ctx.lineTo(x + 11, y + 24);
            ctx.stroke();
          }
          if (value < 0.08) {
            ctx.fillStyle = 'rgba(210,177,137,0.09)';
            ctx.fillRect(x + 7, y + 9, 9, 2);
          }
        }
      }

      // Passagens de porta: estendem visualmente o piso para fora da parede.
      const doorRects = this.getDoorRects();
      for (const [dir, rect] of Object.entries(doorRects)) {
        if (!this.currentRoom.connections.has(dir)) continue;
        ctx.fillStyle = '#2c1b18';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      }

      // Paredes.
      ctx.fillStyle = '#211411';
      ctx.fillRect(ROOM.left - 15, ROOM.top - 15, ROOM.width + 30, 15);
      ctx.fillRect(ROOM.left - 15, ROOM.bottom, ROOM.width + 30, 15);
      ctx.fillRect(ROOM.left - 15, ROOM.top, 15, ROOM.height);
      ctx.fillRect(ROOM.right, ROOM.top, 15, ROOM.height);

      ctx.fillStyle = COLORS.wallLight;
      ctx.fillRect(ROOM.left - 4, ROOM.top - 4, ROOM.width + 8, 4);
      ctx.fillRect(ROOM.left - 4, ROOM.bottom, ROOM.width + 8, 4);
      ctx.fillRect(ROOM.left - 4, ROOM.top, 4, ROOM.height);
      ctx.fillRect(ROOM.right, ROOM.top, 4, ROOM.height);

      // Tijolos das paredes.
      ctx.strokeStyle = 'rgba(12,7,7,0.65)';
      ctx.lineWidth = 1;
      for (let x = ROOM.left; x < ROOM.right; x += 28) {
        ctx.beginPath();
        ctx.moveTo(x, ROOM.top - 15);
        ctx.lineTo(x, ROOM.top);
        ctx.moveTo(x + 10, ROOM.bottom);
        ctx.lineTo(x + 10, ROOM.bottom + 15);
        ctx.stroke();
      }
      for (let y = ROOM.top; y < ROOM.bottom; y += 28) {
        ctx.beginPath();
        ctx.moveTo(ROOM.left - 15, y);
        ctx.lineTo(ROOM.left, y);
        ctx.moveTo(ROOM.right, y + 9);
        ctx.lineTo(ROOM.right + 15, y + 9);
        ctx.stroke();
      }

      // Cantos metálicos/ossos.
      ctx.fillStyle = '#7b5a48';
      for (const [x, y] of [[ROOM.left - 15, ROOM.top - 15], [ROOM.right, ROOM.top - 15], [ROOM.left - 15, ROOM.bottom], [ROOM.right, ROOM.bottom]]) {
        ctx.fillRect(x, y, 15, 15);
      }
      ctx.fillStyle = '#3f2922';
      for (const [x, y] of [[ROOM.left - 12, ROOM.top - 12], [ROOM.right + 3, ROOM.top - 12], [ROOM.left - 12, ROOM.bottom + 3], [ROOM.right + 3, ROOM.bottom + 3]]) {
        ctx.fillRect(x, y, 9, 9);
      }

      for (const dir of DIR_KEYS) this.drawDoor(dir);
      for (const obstacle of room.obstacles) this.drawObstacle(obstacle);

      // Marcas da sala e portas fechadas.
      if (!room.doorIsOpen()) {
        ctx.fillStyle = 'rgba(143,41,40,0.12)';
        ctx.fillRect(ROOM.left, ROOM.top, ROOM.width, ROOM.height);
      }
    }

    getDoorRects() {
      return {
        n: { x: ROOM.cx - 36, y: ROOM.top - 15, w: 72, h: 30 },
        s: { x: ROOM.cx - 36, y: ROOM.bottom - 15, w: 72, h: 30 },
        e: { x: ROOM.right - 15, y: ROOM.cy - 36, w: 30, h: 72 },
        w: { x: ROOM.left - 15, y: ROOM.cy - 36, w: 30, h: 72 },
      };
    }

    drawDoor(dir) {
      const room = this.currentRoom;
      if (!room.connections.has(dir)) return;
      const ctx = this.ctx;
      const rect = this.getDoorRects()[dir];
      const locked = !room.doorIsOpen();
      const isBoss = room.type === 'boss';

      ctx.save();
      if (locked) {
        ctx.fillStyle = '#211315';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = isBoss ? '#6c2325' : '#4b2927';
        const inset = 5;
        if (dir === 'n' || dir === 's') {
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(rect.x + 7 + i * 16, rect.y + inset, 5, rect.h - inset * 2);
          }
          ctx.fillStyle = '#b54941';
          ctx.fillRect(ROOM.cx - 6, rect.y + rect.h / 2 - 6, 12, 12);
          ctx.fillStyle = '#2a1112';
          ctx.fillRect(ROOM.cx - 2, rect.y + rect.h / 2 - 1, 4, 6);
        } else {
          for (let i = 0; i < 4; i++) {
            ctx.fillRect(rect.x + inset, rect.y + 7 + i * 16, rect.w - inset * 2, 5);
          }
          ctx.fillStyle = '#b54941';
          ctx.fillRect(rect.x + rect.w / 2 - 6, ROOM.cy - 6, 12, 12);
          ctx.fillStyle = '#2a1112';
          ctx.fillRect(rect.x + rect.w / 2 - 2, ROOM.cy - 1, 5, 6);
        }
      } else {
        ctx.fillStyle = '#160e0e';
        ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
        ctx.fillStyle = '#7b5641';
        if (dir === 'n') ctx.fillRect(rect.x, rect.y + rect.h - 5, rect.w, 5);
        if (dir === 's') ctx.fillRect(rect.x, rect.y, rect.w, 5);
        if (dir === 'w') ctx.fillRect(rect.x + rect.w - 5, rect.y, 5, rect.h);
        if (dir === 'e') ctx.fillRect(rect.x, rect.y, 5, rect.h);

        const glow = 0.35 + Math.sin(this.elapsed * 4) * 0.12;
        ctx.fillStyle = `rgba(226,173,71,${glow})`;
        const cx = rect.x + rect.w / 2;
        const cy = rect.y + rect.h / 2;
        ctx.beginPath();
        if (dir === 'n') { ctx.moveTo(cx, cy - 6); ctx.lineTo(cx - 7, cy + 4); ctx.lineTo(cx + 7, cy + 4); }
        else if (dir === 's') { ctx.moveTo(cx, cy + 6); ctx.lineTo(cx - 7, cy - 4); ctx.lineTo(cx + 7, cy - 4); }
        else if (dir === 'e') { ctx.moveTo(cx + 6, cy); ctx.lineTo(cx - 4, cy - 7); ctx.lineTo(cx - 4, cy + 7); }
        else { ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 4, cy - 7); ctx.lineTo(cx + 4, cy + 7); }
        ctx.closePath();
        ctx.fill();
      }
      ctx.restore();
    }

    drawObstacle(obstacle) {
      const ctx = this.ctx;
      if (obstacle.type === 'spike') {
        ctx.fillStyle = 'rgba(0,0,0,0.25)';
        ctx.beginPath();
        ctx.ellipse(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h - 1, obstacle.w / 2, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        const count = 4;
        for (let i = 0; i < count; i++) {
          const sx = obstacle.x + 3 + (i * (obstacle.w - 6)) / (count - 1);
          ctx.fillStyle = i % 2 ? '#a89c83' : '#d0c3a3';
          ctx.beginPath();
          ctx.moveTo(sx - 5, obstacle.y + obstacle.h);
          ctx.lineTo(sx, obstacle.y + 1);
          ctx.lineTo(sx + 5, obstacle.y + obstacle.h);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#5d3d32';
          ctx.fillRect(sx - 1, obstacle.y + obstacle.h - 4, 2, 3);
        }
        return;
      }

      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.beginPath();
      ctx.ellipse(obstacle.x + obstacle.w / 2, obstacle.y + obstacle.h - 2, obstacle.w * 0.56, 7, 0, 0, Math.PI * 2);
      ctx.fill();

      const points = [];
      const count = 9;
      for (let i = 0; i < count; i++) {
        const angle = (i / count) * Math.PI * 2;
        const radiusX = obstacle.w * (0.46 + hash01(i, 1, obstacle.seed) * 0.12);
        const radiusY = obstacle.h * (0.42 + hash01(i, 2, obstacle.seed) * 0.15);
        points.push({
          x: obstacle.x + obstacle.w / 2 + Math.cos(angle) * radiusX,
          y: obstacle.y + obstacle.h / 2 + Math.sin(angle) * radiusY,
        });
      }
      ctx.fillStyle = '#372724';
      ctx.beginPath();
      points.forEach((point, i) => i === 0 ? ctx.moveTo(point.x, point.y) : ctx.lineTo(point.x, point.y));
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#171010';
      ctx.lineWidth = 3;
      ctx.stroke();

      ctx.fillStyle = '#6c4b3d';
      ctx.beginPath();
      points.slice(0, 5).forEach((point, i) => i === 0 ? ctx.moveTo(point.x - 2, point.y - 2) : ctx.lineTo(point.x - 2, point.y - 2));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = 'rgba(232,212,183,0.22)';
      ctx.fillRect(obstacle.x + obstacle.w * 0.3, obstacle.y + obstacle.h * 0.25, obstacle.w * 0.25, 3);
    }

    drawRoomItems() {
      const room = this.currentRoom;
      for (const drop of room.drops) {
        const bob = Math.sin(this.elapsed * 4 + drop.phase) * 3;
        this.ctx.save();
        this.ctx.fillStyle = 'rgba(0,0,0,0.25)';
        this.ctx.beginPath();
        this.ctx.ellipse(drop.x, drop.y + 12, 12, 4, 0, 0, Math.PI * 2);
        this.ctx.fill();
        if (drop.type === 'heart') drawHeart(this.ctx, drop.x - 11, drop.y - 10 + bob, 22, 'full', COLORS.red);
        else if (drop.type === 'coin') this.drawCoin(drop.x, drop.y + bob, 11);
        else this.drawBombIcon(drop.x, drop.y + bob, 11);
        this.ctx.restore();
      }

      if (room.treasure && !room.treasureTaken) {
        const bob = Math.sin(this.elapsed * 2.5) * 4;
        const cx = ROOM.cx;
        const cy = ROOM.cy;
        this.ctx.fillStyle = 'rgba(0,0,0,0.32)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy + 23, 32, 10, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.fillStyle = '#533a2c';
        this.ctx.fillRect(cx - 22, cy + 4, 44, 18);
        this.ctx.fillStyle = '#88644c';
        this.ctx.fillRect(cx - 27, cy + 1, 54, 7);
        this.ctx.fillStyle = '#37251f';
        this.ctx.fillRect(cx - 14, cy + 12, 28, 10);

        const color = room.treasure.color;
        this.ctx.save();
        this.ctx.translate(cx, cy - 18 + bob);
        this.ctx.rotate(this.elapsed * 0.6);
        this.ctx.fillStyle = color;
        this.ctx.beginPath();
        this.ctx.moveTo(0, -15);
        this.ctx.lineTo(12, 0);
        this.ctx.lineTo(0, 15);
        this.ctx.lineTo(-12, 0);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.fillStyle = 'rgba(255,255,255,0.55)';
        this.ctx.beginPath();
        this.ctx.moveTo(0, -10);
        this.ctx.lineTo(4, -1);
        this.ctx.lineTo(0, 2);
        this.ctx.lineTo(-3, -2);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.restore();

        const glow = this.ctx.createRadialGradient(cx, cy - 15, 5, cx, cy - 15, 58);
        glow.addColorStop(0, `${color}55`);
        glow.addColorStop(1, `${color}00`);
        this.ctx.fillStyle = glow;
        this.ctx.fillRect(cx - 60, cy - 75, 120, 120);
      } else if (room.treasureTaken) {
        this.ctx.fillStyle = '#533a2c';
        this.ctx.fillRect(ROOM.cx - 22, ROOM.cy + 4, 44, 18);
        this.ctx.fillStyle = '#88644c';
        this.ctx.fillRect(ROOM.cx - 27, ROOM.cy + 1, 54, 7);
      }

      if (room.hatch && room.hatch.active) {
        const cx = room.hatch.x;
        const cy = room.hatch.y;
        this.ctx.fillStyle = 'rgba(0,0,0,0.55)';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy, 38, 24, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = COLORS.gold;
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy, 38, 24, 0, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.fillStyle = '#120c0c';
        this.ctx.beginPath();
        this.ctx.ellipse(cx, cy, 31, 18, 0, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#b6a17d';
        this.ctx.lineWidth = 2;
        for (let i = -1; i <= 1; i++) {
          this.ctx.beginPath();
          this.ctx.moveTo(cx + i * 11, cy - 10);
          this.ctx.lineTo(cx + i * 11, cy + 7);
          this.ctx.stroke();
        }
        this.ctx.fillStyle = COLORS.gold;
        this.ctx.beginPath();
        this.ctx.moveTo(cx, cy + 26);
        this.ctx.lineTo(cx - 8, cy + 15);
        this.ctx.lineTo(cx + 8, cy + 15);
        this.ctx.closePath();
        this.ctx.fill();
      }
    }

    drawBomb(bomb) {
      const ctx = this.ctx;
      const pulse = 1 + Math.sin(this.elapsed * 32) * 0.13;
      ctx.save();
      ctx.translate(bomb.x, bomb.y);
      ctx.scale(pulse, pulse);
      ctx.fillStyle = 'rgba(0,0,0,0.32)';
      ctx.beginPath();
      ctx.ellipse(0, 12, 13, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#171419';
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#3f3941';
      ctx.beginPath();
      ctx.arc(-4, -4, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#b99b80';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(6, -9);
      ctx.quadraticCurveTo(13, -18, 9, -23);
      ctx.stroke();
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath();
      ctx.arc(9, -24, 3 + Math.sin(this.elapsed * 30), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    drawParticles() {
      for (const particle of this.particles) {
        this.ctx.globalAlpha = clamp(particle.life / particle.maxLife, 0, 1);
        this.ctx.fillStyle = particle.color;
        const size = Math.max(1, particle.size * clamp(particle.life / particle.maxLife, 0.2, 1));
        this.ctx.fillRect(particle.x - size / 2, particle.y - size / 2, size, size);
      }
      this.ctx.globalAlpha = 1;
    }

    drawFloatingTexts() {
      for (const text of this.floatingTexts) {
        const alpha = clamp(text.life / text.maxLife, 0, 1);
        this.ctx.globalAlpha = alpha;
        this.ctx.font = '900 12px "Courier New", monospace';
        this.ctx.textAlign = 'center';
        this.ctx.fillStyle = '#130d0d';
        this.ctx.fillText(text.text, text.x + 1, text.y + 1);
        this.ctx.fillStyle = text.color;
        this.ctx.fillText(text.text, text.x, text.y);
      }
      this.ctx.globalAlpha = 1;
      this.ctx.textAlign = 'left';
    }

    drawVignette() {
      const gradient = this.ctx.createRadialGradient(WIDTH / 2, HEIGHT / 2, 220, WIDTH / 2, HEIGHT / 2, 610);
      gradient.addColorStop(0, 'rgba(8,4,4,0)');
      gradient.addColorStop(0.72, 'rgba(8,4,4,0.18)');
      gradient.addColorStop(1, 'rgba(4,2,2,0.7)');
      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    drawToast() {
      if (this.toastTimer <= 0) return;
      const alpha = clamp(this.toastTimer / 0.4, 0, 1);
      this.ctx.save();
      this.ctx.globalAlpha = Math.min(1, alpha);
      this.ctx.font = '900 15px "Courier New", monospace';
      this.ctx.textAlign = 'center';
      const text = this.toastText;
      const width = Math.min(650, this.ctx.measureText(text).width + 34);
      this.ctx.fillStyle = 'rgba(13,8,8,0.78)';
      this.ctx.fillRect(ROOM.cx - width / 2, 113, width, 28);
      this.ctx.strokeStyle = 'rgba(226,173,71,0.46)';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(ROOM.cx - width / 2 + 0.5, 113.5, width - 1, 27);
      this.ctx.fillStyle = this.toastColor || COLORS.bone;
      this.ctx.fillText(text, ROOM.cx, 132);
      this.ctx.restore();
    }

    drawHUD() {
      const ctx = this.ctx;
      const p = this.player;

      const hudGradient = ctx.createLinearGradient(0, 0, 0, HUD_HEIGHT);
      hudGradient.addColorStop(0, 'rgba(18,11,11,0.98)');
      hudGradient.addColorStop(1, 'rgba(31,20,18,0.96)');
      ctx.fillStyle = hudGradient;
      ctx.fillRect(0, 0, WIDTH, HUD_HEIGHT);
      ctx.fillStyle = '#6a493b';
      ctx.fillRect(0, HUD_HEIGHT - 3, WIDTH, 3);
      ctx.fillStyle = 'rgba(232,212,183,0.09)';
      ctx.fillRect(0, 0, WIDTH, 1);

      // Corações (cheio / meio / vazio).
      for (let i = 0; i < p.maxHearts; i++) {
        const value = p.health - i * 2;
        const mode = value >= 2 ? 'full' : value >= 1 ? 'half' : 'empty';
        drawHeart(ctx, 17 + i * 31, 15, 27, mode, COLORS.red);
      }

      const statusX = 24 + p.maxHearts * 31;
      this.drawCoin(statusX, 30, 11);
      ctx.font = '900 17px "Courier New", monospace';
      ctx.fillStyle = COLORS.bone;
      ctx.textAlign = 'left';
      ctx.fillText(String(p.coins).padStart(2, '0'), statusX + 18, 36);

      this.drawBombIcon(statusX + 63, 30, 11);
      ctx.fillStyle = COLORS.bone;
      ctx.fillText(String(p.bombs).padStart(2, '0'), statusX + 81, 36);

      // Andar e estado.
      ctx.textAlign = 'center';
      ctx.fillStyle = COLORS.gold;
      ctx.font = '900 14px "Courier New", monospace';
      ctx.fillText(`ANDAR ${this.floor}/${MAX_FLOORS}`, 490, 26);
      ctx.fillStyle = COLORS.boneDark;
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillText(this.currentRoom.type === 'boss' ? 'SALA DO CHEFE' : 'ABOMINÁVEL', 490, 43);

      this.drawMinimap();
      this.drawBossBar();
      this.drawBottomBar();
    }

    drawCoin(x, y, radius) {
      const ctx = this.ctx;
      ctx.fillStyle = '#6f4b17';
      ctx.beginPath();
      ctx.arc(x, y, radius + 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = COLORS.gold;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f0ce74';
      ctx.beginPath();
      ctx.arc(x - 3, y - 3, radius * 0.42, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#9b6b22';
      ctx.fillRect(x - 1, y - 5, 2, 10);
    }

    drawBombIcon(x, y, radius) {
      const ctx = this.ctx;
      ctx.fillStyle = '#0e0c0e';
      ctx.beginPath();
      ctx.arc(x, y + 1, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#796c63';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + radius * 0.5, y - radius * 0.7);
      ctx.quadraticCurveTo(x + radius * 1.2, y - radius * 1.7, x + radius * 0.8, y - radius * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffd36b';
      ctx.beginPath();
      ctx.arc(x + radius * 0.8, y - radius * 2, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#625c63';
      ctx.beginPath();
      ctx.arc(x - radius * 0.32, y - radius * 0.35, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();
    }

    drawMinimap() {
      const ctx = this.ctx;
      const panelX = 766;
      const panelY = 8;
      const panelW = 176;
      const panelH = 130;
      ctx.fillStyle = 'rgba(14,9,9,0.88)';
      ctx.fillRect(panelX, panelY, panelW, panelH);
      ctx.strokeStyle = '#594035';
      ctx.lineWidth = 2;
      ctx.strokeRect(panelX + 0.5, panelY + 0.5, panelW - 1, panelH - 1);

      ctx.fillStyle = COLORS.boneDark;
      ctx.font = '900 10px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.fillText('MAPA', panelX + 10, panelY + 18);
      ctx.fillStyle = COLORS.gold;
      ctx.textAlign = 'right';
      ctx.fillText(`ANDAR ${this.floor}`, panelX + panelW - 10, panelY + 18);

      const cell = 20;
      const gap = 3;
      const gridSize = cell * 4 + gap * 3;
      const startX = panelX + (panelW - gridSize) / 2;
      const startY = panelY + 29;
      const centerOf = (room) => ({
        x: startX + room.gridX * (cell + gap) + cell / 2,
        y: startY + room.gridY * (cell + gap) + cell / 2,
      });

      // Conexões entre salas já visitadas.
      ctx.strokeStyle = 'rgba(232,212,183,0.32)';
      ctx.lineWidth = 2;
      for (const room of this.rooms.values()) {
        if (!room.visited) continue;
        const a = centerOf(room);
        for (const neighborKey of room.connections.values()) {
          const neighbor = this.rooms.get(neighborKey);
          if (!neighbor || !neighbor.visited) continue;
          const b = centerOf(neighbor);
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }

      for (const room of this.rooms.values()) {
        if (!room.visited) continue;
        const x = startX + room.gridX * (cell + gap);
        const y = startY + room.gridY * (cell + gap);
        let fill = '#6b5043';
        if (room.type === 'start') fill = '#a38c72';
        if (room.type === 'treasure') fill = '#ba8b36';
        if (room.type === 'boss') fill = '#8f2928';
        if (room === this.currentRoom) fill = '#d4b16a';
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, cell, cell);
        ctx.strokeStyle = room === this.currentRoom ? COLORS.bone : 'rgba(12,8,8,0.7)';
        ctx.lineWidth = room === this.currentRoom ? 2 : 1;
        ctx.strokeRect(x + 0.5, y + 0.5, cell - 1, cell - 1);
        if (room.type === 'boss' && room !== this.currentRoom) {
          ctx.fillStyle = '#f0c0a0';
          ctx.fillRect(x + 8, y + 8, 4, 4);
        }
      }

      const current = this.currentRoom;
      if (current) {
        const c = centerOf(current);
        ctx.strokeStyle = `rgba(226,173,71,${0.55 + Math.sin(this.elapsed * 4) * 0.25})`;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, cell * 0.9, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = '#756055';
      ctx.font = '700 8px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('● ATUAL   ◆ TESOURO   ✦ CHEFE', panelX + panelW / 2, panelY + panelH - 7);
    }

    drawBossBar() {
      if (this.currentRoom.type !== 'boss') return;
      const boss = this.currentRoom.enemies.find((enemy) => enemy.type === 'boss');
      if (!boss || boss.hp <= 0) return;
      const ctx = this.ctx;
      const x = 276;
      const y = 78;
      const width = 408;
      const height = 17;
      ctx.fillStyle = 'rgba(12,7,7,0.85)';
      ctx.fillRect(x - 3, y - 3, width + 6, height + 6);
      ctx.strokeStyle = '#a24b3c';
      ctx.lineWidth = 2;
      ctx.strokeRect(x - 2, y - 2, width + 4, height + 4);
      ctx.fillStyle = '#35191a';
      ctx.fillRect(x, y, width, height);
      const gradient = ctx.createLinearGradient(x, y, x, y + height);
      gradient.addColorStop(0, '#d95748');
      gradient.addColorStop(1, '#752225');
      ctx.fillStyle = gradient;
      ctx.fillRect(x, y, width * clamp(boss.hp / boss.maxHp, 0, 1), height);
      ctx.fillStyle = COLORS.bone;
      ctx.font = '900 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText('O CARNICEIRO', x + width / 2, y - 7);
    }

    drawBottomBar() {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(12,8,8,0.97)';
      ctx.fillRect(0, ROOM.bottom + 15, WIDTH, HEIGHT - ROOM.bottom - 15);
      ctx.fillStyle = '#4e342b';
      ctx.fillRect(0, ROOM.bottom + 15, WIDTH, 2);

      const arrowText = this.arrowMode === 'shoot' ? 'C: SETAS ATIRAM' : 'C: SETAS MOVEM';
      ctx.textAlign = 'left';
      ctx.font = '900 11px "Courier New", monospace';
      ctx.fillStyle = this.arrowMode === 'shoot' ? COLORS.gold : COLORS.cyan;
      ctx.fillText(arrowText, 26, 618);
      ctx.fillStyle = '#806c60';
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillText('WASD MOVER  •  IJKL ATIRAR  •  ESPAÇO/Q BOMBA', 170, 618);

      ctx.textAlign = 'center';
      ctx.fillStyle = this.audio.musicEnabled ? COLORS.gold : '#715f55';
      ctx.font = '900 10px "Courier New", monospace';
      ctx.fillText(`M MÚSICA: ${this.audio.musicEnabled ? 'ON' : 'OFF'}`, 620, 618);
      ctx.fillStyle = this.audio.sfxEnabled ? COLORS.cyan : '#715f55';
      ctx.fillText(`N EFEITOS: ${this.audio.sfxEnabled ? 'ON' : 'OFF'}`, 740, 618);
      ctx.fillStyle = '#8f776a';
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillText('O ÁUDIO', 830, 618);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#a68c7d';
      const itemLabel = this.player.items.length ? `${this.player.items.length} ITEM${this.player.items.length > 1 ? 'S' : ''}` : 'SEM ITENS';
      ctx.fillText(itemLabel, WIDTH - 26, 618);
    }

    // -------------------------------------------------------------------------
    // Tela de seleção de personagem
    // -------------------------------------------------------------------------
    drawSelection() {
      const ctx = this.ctx;
      const bg = ctx.createRadialGradient(WIDTH / 2, 270, 60, WIDTH / 2, 330, 620);
      bg.addColorStop(0, '#3d2520');
      bg.addColorStop(0.45, '#211412');
      bg.addColorStop(1, '#090607');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      for (let i = 0; i < 10; i++) {
        const x = 44 + i * 98;
        const flicker = 0.3 + Math.sin(this.elapsed * 5 + i * 1.7) * 0.13;
        ctx.fillStyle = `rgba(124,54,44,${flicker})`;
        ctx.fillRect(x, 70, 2, 12);
        ctx.fillStyle = `rgba(226,173,71,${flicker * 0.8})`;
        ctx.fillRect(x, 66 + Math.sin(this.elapsed * 8 + i) * 2, 2, 4);
      }

      for (const dust of this.menuDust) {
        const y = (dust.y - this.elapsed * dust.speed) % HEIGHT;
        ctx.globalAlpha = dust.alpha;
        ctx.fillStyle = COLORS.boneDark;
        ctx.fillRect(dust.x, y < 0 ? y + HEIGHT : y, dust.r, dust.r);
      }
      ctx.globalAlpha = 1;

      ctx.fillStyle = 'rgba(11,7,7,0.55)';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      ctx.textAlign = 'center';
      ctx.font = '900 54px "Courier New", monospace';
      ctx.fillStyle = '#391718';
      ctx.fillText('ABOMINÁVEL', WIDTH / 2 + 4, 91);
      ctx.fillStyle = COLORS.bone;
      ctx.fillText('ABOMINÁVEL', WIDTH / 2, 87);
      ctx.fillStyle = COLORS.red;
      ctx.font = '900 12px "Courier New", monospace';
      ctx.fillText('O JOGO DAS LÁGRIMAS', WIDTH / 2, 111);
      ctx.fillStyle = 'rgba(232,212,183,0.3)';
      ctx.fillRect(WIDTH / 2 - 180, 123, 360, 1);

      for (let i = 0; i < CHARACTERS.length; i++) {
        this.drawCharacterCard(i, i === 0 ? 122 : 508, 142, 330, 402);
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = `rgba(232,212,183,${0.66 + Math.sin(this.elapsed * 3) * 0.16})`;
      ctx.font = '900 14px "Courier New", monospace';
      ctx.fillText('◀  A / D  ▶   ESCOLHER', WIDTH / 2 - 130, 580);
      ctx.fillStyle = COLORS.gold;
      ctx.fillText('ENTER  INICIAR', WIDTH / 2 + 155, 580);
      ctx.fillStyle = this.arrowMode === 'shoot' ? COLORS.gold : COLORS.cyan;
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillText(`C  SETAS: ${this.arrowMode === 'shoot' ? 'ATIRAR' : 'MOVER'}   •   WASD MOVER   •   IJKL ATIRAR   •   M MÚSICA: ${this.audio.musicEnabled ? 'ON' : 'OFF'}   •   N EFEITOS: ${this.audio.sfxEnabled ? 'ON' : 'OFF'}   •   O ÁUDIO`, WIDTH / 2, 608);
      ctx.fillStyle = 'rgba(232,212,183,0.3)';
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillText('As imagens em /assets substituem os sprites desenhados automaticamente.', WIDTH / 2, 630);
    }

    drawCharacterCard(index, x, y, w, h) {
      const ctx = this.ctx;
      const character = CHARACTERS[index];
      const selected = index === this.selectedCharacter;
      const pulse = selected ? Math.sin(this.elapsed * 5) * 2 : 0;

      ctx.save();
      if (selected) {
        ctx.shadowColor = 'rgba(226,173,71,0.4)';
        ctx.shadowBlur = 22;
      }
      ctx.fillStyle = selected ? 'rgba(48,27,24,0.97)' : 'rgba(25,16,15,0.9)';
      ctx.fillRect(x, y, w, h);
      ctx.shadowBlur = 0;
      ctx.strokeStyle = selected ? COLORS.gold : '#574038';
      ctx.lineWidth = selected ? 3 : 2;
      ctx.strokeRect(x + 1.5, y + 1.5, w - 3, h - 3);
      ctx.strokeStyle = 'rgba(232,212,183,0.12)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x + 8, y + 8, w - 16, h - 16);

      if (selected) {
        ctx.fillStyle = COLORS.gold;
        ctx.beginPath();
        ctx.moveTo(x + w / 2 - 8, y - 13 - pulse);
        ctx.lineTo(x + w / 2 + 8, y - 13 - pulse);
        ctx.lineTo(x + w / 2, y - 3 - pulse);
        ctx.closePath();
        ctx.fill();
      }

      ctx.textAlign = 'center';
      ctx.fillStyle = selected ? COLORS.bone : COLORS.boneDark;
      ctx.font = '900 13px "Courier New", monospace';
      ctx.fillText(character.subtitle, x + w / 2, y + 29);
      ctx.fillStyle = selected ? COLORS.gold : '#795d4e';
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillText(selected ? 'SELECIONADO' : 'AGUARDANDO', x + w / 2, y + 45);

      const sprite = this.characterSprites[index];
      if (sprite && sprite.ready) {
        const maxW = 120;
        const maxH = 142;
        const ratio = Math.min(maxW / sprite.naturalWidth, maxH / sprite.naturalHeight);
        const drawW = sprite.naturalWidth * ratio;
        const drawH = sprite.naturalHeight * ratio;
        ctx.drawImage(sprite, x + w / 2 - drawW / 2, y + 190 - drawH, drawW, drawH);
      } else {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + 151, 47, 11, 0, 0, Math.PI * 2);
        ctx.fill();
        drawCharacterFigure(ctx, character, x + w / 2, y + 145, 2.1, 's', this.elapsed);
        ctx.restore();
      }

      ctx.fillStyle = selected ? COLORS.bone : '#b19783';
      ctx.font = '900 30px "Courier New", monospace';
      ctx.fillText(character.name, x + w / 2, y + 226);
      ctx.fillStyle = selected ? COLORS.red : '#8b6655';
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillText(character.tagline.toUpperCase(), x + w / 2, y + 243);

      ctx.fillStyle = 'rgba(10,6,6,0.38)';
      ctx.fillRect(x + 22, y + 257, w - 44, 112);
      ctx.textAlign = 'left';
      ctx.font = '700 10px "Courier New", monospace';
      ctx.fillStyle = COLORS.boneDark;
      ctx.fillText('VIDA', x + 33, y + 276);
      for (let i = 0; i < character.health; i++) {
        drawHeart(ctx, x + 91 + i * 22, y + 264, 18, 'full', COLORS.red);
      }

      this.drawStatBar(x + 33, y + 294, w - 66, 'VELOCIDADE', (character.speed - 130) / 120, COLORS.cyan);
      this.drawStatBar(x + 33, y + 316, w - 66, 'DANO', (character.damage - 0.4) / 1.1, COLORS.red);
      this.drawStatBar(x + 33, y + 338, w - 66, 'CADÊNCIA', (0.4 - character.fireInterval) / 0.26, COLORS.gold);
      this.drawStatBar(x + 33, y + 360, w - 66, 'ALCANCE', (character.range - 200) / 130, COLORS.boneDark);

      ctx.fillStyle = '#9c8171';
      ctx.font = 'italic 10px "Courier New", monospace';
      ctx.textAlign = 'center';
      ctx.fillText(character.description, x + w / 2, y + 389);
      ctx.restore();
    }

    drawStatBar(x, y, width, label, ratio, color) {
      const ctx = this.ctx;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#a88a77';
      ctx.font = '700 9px "Courier New", monospace';
      ctx.fillText(label, x, y + 7);
      const barX = x + 78;
      const barWidth = width - 78;
      ctx.fillStyle = 'rgba(8,5,5,0.7)';
      ctx.fillRect(barX, y, barWidth, 7);
      ctx.fillStyle = color;
      ctx.fillRect(barX, y, barWidth * clamp(ratio, 0.05, 1), 7);
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.fillRect(barX, y, barWidth * clamp(ratio, 0.05, 1), 2);
    }

    loop(time) {
      const dt = Math.min(0.033, Math.max(0, (time - this.lastTime) / 1000));
      this.lastTime = time;
      this.elapsed += dt;
      if (this.state === 'play') this.update(dt);
      else if (this.state === 'gameover' || this.state === 'victory') this.updateEffects(dt);
      this.arrowTogglePulse = Math.max(0, this.arrowTogglePulse - dt * 2);
      this.render();
      requestAnimationFrame((nextTime) => this.loop(nextTime));
    }
  }

  // ---------------------------------------------------------------------------
  // Desenho vetorial dos personagens (fallback dos sprites opcionais)
  // ---------------------------------------------------------------------------
  function drawHeart(ctx, x, y, size, mode = 'full', color = COLORS.red) {
    const path = () => {
      ctx.beginPath();
      ctx.moveTo(x + size * 0.5, y + size * 0.9);
      ctx.bezierCurveTo(x + size * 0.08, y + size * 0.6, x - size * 0.02, y + size * 0.24, x + size * 0.26, y + size * 0.12);
      ctx.bezierCurveTo(x + size * 0.42, y + size * 0.04, x + size * 0.5, y + size * 0.18, x + size * 0.5, y + size * 0.22);
      ctx.bezierCurveTo(x + size * 0.5, y + size * 0.18, x + size * 0.58, y + size * 0.04, x + size * 0.74, y + size * 0.12);
      ctx.bezierCurveTo(x + size * 1.02, y + size * 0.24, x + size * 0.92, y + size * 0.6, x + size * 0.5, y + size * 0.9);
      ctx.closePath();
    };

    ctx.save();
    path();
    ctx.fillStyle = mode === 'empty' ? '#342120' : '#4a2020';
    ctx.fill();
    if (mode === 'full' || mode === 'half') {
      ctx.save();
      if (mode === 'half') {
        ctx.beginPath();
        ctx.rect(x, y, size * 0.5, size);
        ctx.clip();
      }
      path();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    }
    path();
    ctx.strokeStyle = mode === 'empty' ? '#1a1010' : '#140c0c';
    ctx.lineWidth = Math.max(1, size * 0.08);
    ctx.stroke();
    if (mode !== 'empty') {
      ctx.fillStyle = 'rgba(255,239,218,0.6)';
      ctx.beginPath();
      ctx.ellipse(x + size * 0.3, y + size * 0.3, size * 0.1, size * 0.06, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCharacterFigure(ctx, character, x, y, scale = 1, facing = 's', elapsed = 0) {
    const isMau = character.id === 'mau';
    const bob = Math.sin(elapsed * 4.5) * 0.5;
    const stride = Math.sin(elapsed * 11) * 1.2;

    const skin = isMau ? '#d1a077' : '#b97854';
    const skinShadow = isMau ? '#a46c4d' : '#835039';
    const shirt = isMau ? '#18171c' : '#0e1420';
    const shirtDark = isMau ? '#0c0c10' : '#080b12';
    const pants = isMau ? '#111216' : '#090d15';
    const accent = isMau ? '#2d2b31' : COLORS.cyan;
    const accent2 = isMau ? '#51423a' : COLORS.magenta;

    ctx.save();
    ctx.translate(x, y + bob);
    ctx.scale(scale, scale);

    // Pernas, calças e sapatos.
    ctx.fillStyle = pants;
    ctx.fillRect(-11, 8 + stride * 0.25, 9, 20);
    ctx.fillRect(2, 8 - stride * 0.25, 9, 20);
    ctx.fillStyle = isMau ? '#65727b' : '#141a24';
    ctx.fillRect(-13, 26 + stride * 0.3, 12, 6);
    ctx.fillRect(2, 26 - stride * 0.3, 12, 6);
    if (isMau) {
      ctx.fillStyle = '#3f4b53';
      for (let i = 0; i < 3; i++) ctx.fillRect(-10 + i * 3, 27 + stride * 0.3, 1, 2);
    } else {
      ctx.fillStyle = accent;
      ctx.fillRect(-11, 28, 4, 1);
      ctx.fillRect(5, 28, 4, 1);
    }
    if (!isMau) {
      ctx.fillStyle = accent2;
      ctx.fillRect(-9, 11, 2, 13);
      ctx.fillRect(7, 11, 2, 13);
    }

    // Braços e mãos.
    ctx.fillStyle = shirtDark;
    ctx.fillRect(-19, -8, 6, 20);
    ctx.fillRect(13, -8, 6, 20);
    ctx.fillStyle = skin;
    ctx.fillRect(-19, 10, 6, 7);
    ctx.fillRect(13, 10, 6, 7);

    // Torso.
    ctx.fillStyle = shirt;
    ctx.beginPath();
    ctx.moveTo(-15, -12);
    ctx.lineTo(15, -12);
    ctx.lineTo(14, 12);
    ctx.lineTo(8, 15);
    ctx.lineTo(-8, 15);
    ctx.lineTo(-14, 12);
    ctx.closePath();
    ctx.fill();

    if (isMau) {
      // Camiseta preta, faixa/tatuagens do personagem de referência.
      ctx.fillStyle = '#242227';
      ctx.fillRect(-13, -9, 26, 5);
      ctx.fillStyle = '#0b0b0e';
      ctx.fillRect(-10, -3, 20, 3);
      ctx.fillStyle = '#765040';
      ctx.fillRect(-17, -3, 2, 8);
      ctx.fillRect(15, 1, 2, 7);
      ctx.fillRect(-16, 5, 5, 1);
      ctx.fillRect(12, 6, 5, 1);
      ctx.fillStyle = skinShadow;
      ctx.fillRect(-14, 12, 4, 3);
      ctx.fillRect(10, 12, 4, 3);
      ctx.fillStyle = '#1a191d';
      ctx.fillRect(5, -8, 2, 4);
      ctx.fillStyle = '#6d5b4f';
      ctx.fillRect(6, -7, 1, 2);
    } else {
      // Jaqueta tecnológica com circuitos ciano e magenta.
      ctx.strokeStyle = accent;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(-11, -9);
      ctx.lineTo(-11, -2);
      ctx.lineTo(-7, 2);
      ctx.lineTo(-7, 9);
      ctx.moveTo(11, -9);
      ctx.lineTo(11, 0);
      ctx.lineTo(6, 4);
      ctx.lineTo(6, 11);
      ctx.stroke();
      ctx.fillStyle = accent2;
      ctx.fillRect(-14, 6, 7, 1);
      ctx.fillRect(8, -5, 6, 1);
      ctx.fillRect(-5, 4, 3, 1);
      ctx.fillStyle = '#1b2331';
      ctx.fillRect(-1, -9, 2, 16);
      ctx.fillStyle = '#84d8d1';
      ctx.fillRect(-2, 7, 1, 3);
      ctx.fillStyle = '#6f4d3e';
      ctx.fillRect(-15, 12, 4, 3);
      ctx.fillRect(11, 12, 4, 3);
    }

    // Pescoço e cabeça.
    ctx.fillStyle = skinShadow;
    ctx.fillRect(-5, -17, 10, 7);
    ctx.fillStyle = skin;
    ctx.beginPath();
    ctx.ellipse(0, -24, 11, 12, 0, 0, Math.PI * 2);
    ctx.fill();

    if (isMau) {
      // Barba e laterais do cabelo cacheado.
      ctx.fillStyle = '#221716';
      ctx.beginPath();
      ctx.arc(-9, -22, 4, 0, Math.PI * 2);
      ctx.arc(9, -22, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#33201a';
      if (facing !== 'n') {
        ctx.fillRect(-6, -17, 12, 7);
        ctx.fillStyle = skin;
        ctx.fillRect(-3, -18, 6, 3);
      }
      ctx.fillStyle = '#d8b08a';
      if (facing !== 'n') {
        const eyeOffset = facing === 'e' ? 3 : facing === 'w' ? -3 : 0;
        ctx.fillRect(-5 + eyeOffset, -27, 3, 2);
        if (facing === 's') ctx.fillRect(3, -27, 3, 2);
      }
      // Boné preto.
      ctx.fillStyle = '#111014';
      ctx.beginPath();
      ctx.arc(0, -29, 11, Math.PI, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(-11, -30, 22, 5);
      ctx.fillStyle = '#1f1d22';
      ctx.fillRect(-3, -31, 6, 2);
      if (facing === 's') {
        ctx.fillStyle = '#0b0a0c';
        ctx.fillRect(-13, -26, 14, 3);
      } else if (facing === 'e') {
        ctx.fillStyle = '#0b0a0c';
        ctx.fillRect(6, -27, 12, 3);
      } else if (facing === 'w') {
        ctx.fillStyle = '#0b0a0c';
        ctx.fillRect(-18, -27, 12, 3);
      }
    } else {
      // Cabelo cacheado, fones e detalhes neon.
      ctx.fillStyle = '#171217';
      ctx.beginPath();
      ctx.arc(-10, -28, 5, 0, Math.PI * 2);
      ctx.arc(-6, -33, 5, 0, Math.PI * 2);
      ctx.arc(0, -35, 5, 0, Math.PI * 2);
      ctx.arc(6, -33, 5, 0, Math.PI * 2);
      ctx.arc(10, -28, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2d2020';
      if (facing !== 'n') ctx.fillRect(-5, -17, 10, 4);
      if (facing !== 'n') {
        ctx.fillStyle = '#211718';
        const eyeOffset = facing === 'e' ? 3 : facing === 'w' ? -3 : 0;
        ctx.fillRect(-5 + eyeOffset, -27, 3, 2);
        if (facing === 's') ctx.fillRect(3, -27, 3, 2);
      }
      // Headset.
      ctx.strokeStyle = '#242630';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, -29, 12, Math.PI * 0.92, Math.PI * 2.08);
      ctx.stroke();
      ctx.fillStyle = '#1b1e29';
      ctx.fillRect(-16, -29, 5, 10);
      ctx.fillRect(11, -29, 5, 10);
      ctx.fillStyle = accent;
      ctx.fillRect(12, -26, 2, 2);
      // Gola high-tech.
      ctx.fillStyle = '#141b27';
      ctx.fillRect(-12, -17, 24, 6);
      ctx.fillStyle = accent2;
      ctx.fillRect(-13, -14, 26, 1);
    }

    ctx.restore();
  }

  // ---------------------------------------------------------------------------
  // Inicialização
  // ---------------------------------------------------------------------------
  const game = new Game();
  window.__abominavel = game;
})();
