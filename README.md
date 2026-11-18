# ABOMINÁVEL — O Jogo das Lágrimas

Roguelike de ação 2D top-down feito com **HTML, CSS e JavaScript puro**, desenhado em um `<canvas>` de 960×640. Sem frameworks, sem dependências e sem etapa de build.

Explore salas geradas proceduralmente, limpe cada sala para abrir as portas, colete itens passivos e enfrente **O Carniceiro** ao final de cada andar. São três andares até a vitória.

---

## ✨ Funcionalidades

- **Mapa procedural** por andar, com salas normais, sala de tesouro, sala inicial e sala do chefe.
- **Combate twin-stick**: mova com uma mão, atire com a outra (ou use as setas para a função que preferir).
- **Dois personagens jogáveis** com atributos e estilos diferentes.
- **Inimigos variados**: perseguidores, atiradores e saltadores.
- **Chefe ao final de cada andar**, com padrões alternados de rajada radial e investida.
- **Itens passivos** que alteram dano, velocidade, alcance e quantidade de projéteis.
- **Bombas**, corações, moedas e alçapão para o próximo andar.
- **Minimapa** que revela as salas visitadas.
- **Trilha sonora procedural em 8 bits/dubstep**, com faixa exclusiva e mais rápida para o chefe.
- **Menu de áudio** com canais independentes para música e efeitos.
- **Efeitos sonoros sintetizados** via Web Audio API — nenhum arquivo de áudio externo.
- **Visual desenhado em canvas**, com sprites vetoriais e suporte opcional a PNGs.

---

## 🎮 Como jogar

Não há instalação. Basta abrir o `index.html` no navegador.

Para rodar com um servidor local (recomendado para evitar restrições de `file://`):

```bash
# Python 3
python -m http.server 8000

# ou Node.js
npx serve .
```

Depois acesse `http://localhost:8000`.

> O áudio só começa após a primeira interação com a página (clique ou tecla), seguindo a política de autoplay dos navegadores.

---

## ⌨️ Controles

| Tecla | Ação |
| --- | --- |
| `WASD` | Mover o personagem |
| `IJKL` | Atirar nas quatro direções |
| `Setas` | Mover **ou** atirar (alternado com `C`) |
| `C` | Alternar a função das setas |
| `Espaço` / `Q` | Soltar uma bomba |
| `Enter` | Iniciar, continuar ou reiniciar |
| `Esc` | Pausar / voltar |
| `A` / `D` ou `←` / `→` | Escolher personagem no menu |
| `M` | Ligar/desligar a música |
| `N` | Ligar/desligar os efeitos sonoros |
| `O` | Abrir/fechar o menu de áudio |

O menu de áudio também pode ser aberto pelo botão **Áudio** da tela de pausa, pelo botão **Áudio** do rodapé ou pela tecla `O`.

---

## 🧙 Personagens

| Personagem | Estilo | Corações | Velocidade | Dano | Cadência | Alcance |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| **COOW** — O Andarilho | Equilibrado e teimoso | 3 | 186 | 1,15 | 0,34 s | 300 |
| **MAU** — O Circuito | Rápido, frágil e elétrico | 2 | 235 | 0,72 | 0,18 s | 250 |

Cada coração equivale a 2 pontos de vida. COOW começa com 6 HP e MAU com 4 HP.

---

## 🗡️ Itens passivos

Encontrados na sala do tesouro:

| Item | Efeito |
| --- | --- |
| **Lâmina de Obsidiana** | +0,55 de dano |
| **Botas de Cinza** | +20 de velocidade |
| **Olho do Abismo** | +65 de alcance |
| **Eco de Lágrimas** | Dois projéteis por disparo; se já possuído, +0,35 de dano |

Os itens disponíveis evitam repetições até que todos tenham sido coletados.

---

## 👹 Inimigos e chefe

| Inimigo | Comportamento |
| --- | --- |
| **Perseguidor** | Corre diretamente atrás do jogador |
| **Atirador** | Mantém distância, faz strafe e dispara projéteis |
| **Saltador** | Investe em uma dash curta quando o jogador se aproxima |
| **O Carniceiro** | Chefe do andar: alterna rajadas radiais de projéteis com investidas; a cada andar ganha mais vida e dano |

Obstáculos como pedras bloqueiam o movimento, e espinhos causam dano por contato.

**Loop de progressão:** limpe a sala → as portas abrem → avance pelo mapa → pegue o tesouro → derrote o chefe → use o alçapão. Ao passar de andar, o personagem recupera 1 coração e ganha 1 bomba. Após o terceiro andar, a vitória é exibida.

Moedas são coletadas como pontuação e aparecem no resumo final.

---

## 🔊 Áudio

Toda a trilha e os efeitos são gerados em tempo real com a **Web Audio API**:

- **Trilha normal:** 140 BPM, baixo com filtro wobble, bateria e lead chiptune.
- **Trilha do chefe:** 158 BPM, padrões diferentes, baixo sawtooth mais agressivo, kick mais denso e estocada dissonante de trítono.
- A faixa do chefe entra automaticamente na sala do chefe e a trilha normal retorna após a vitória sobre ele ou ao voltar ao menu.
- **Música** e **efeitos** usam canais de ganho separados e podem ser desligados de forma independente.

---

## 📁 Estrutura do projeto

```text
biding/
├── index.html    # Estrutura da página, canvas e overlays
├── style.css     # Tema visual, layout, painéis e responsividade
├── game.js       # Jogo completo: classes, áudio, input e renderização
├── coow.jpeg     # Referência visual do personagem COOW
├── mau.jpeg      # Referência visual do personagem MAU
└── README.md
```

Sprites opcionais podem ser colocados em `assets/personagem1.png` (COOW) e `assets/personagem2.png` (MAU). Se os arquivos não existirem, o jogo usa automaticamente os personagens desenhados em canvas — os avisos `404` no console são esperados e não afetam a execução.

---

## 🛠️ Tecnologias

- **HTML5 Canvas** para renderização 2D.
- **CSS3** para o tema, overlays e layout responsivo.
- **JavaScript (ES6+)** organizado em classes, sem bibliotecas.
- **Web Audio API** para música e efeitos procedurais.

O canvas interno tem resolução fixa de **960×640** e é escalado via CSS mantendo a proporção 3:2.

---

## 🚀 Publicando no GitHub

```bash
git init
git add README.md index.html style.css game.js coow.jpeg mau.jpeg
git commit -m "feat: jogo Abominável com trilha procedural"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

Se quiser evitar subir configurações locais, adicione um `.gitignore` com:

```gitignore
.agents/
.opencode/
skills-lock.json
jogo-roguelike-2d-top-down-em-canvas.json
```

> Ajuste as regras conforme os arquivos que deseja versionar. O `jogo-roguelike-2d-top-down-em-canvas.json` é um artefato local grande e provavelmente não precisa ir para o repositório.

---

## 📄 Licença

Projeto pessoal sem licença definida até o momento. Entre em contato com o autor antes de reutilizar ou redistribuir.

---

Feito com HTML, CSS, JavaScript e muitas lágrimas.
