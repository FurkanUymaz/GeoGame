Atlas XI

A web-based football tic-tac-toe game with an interactive world map for picking leagues and nations.

Live Demo: https://furkanuymaz.github.io/geogame/

About the Game

Instead of using fixed daily grids, Atlas XI lets you set up your own 3x3 board by selecting countries directly on a canvas world map or from the side list. After picking the axes, players take turns naming footballers who match both the row and column to get three in a row.

Game Modes & Rules

- Club x Club: Pick two countries/leagues for the horizontal and vertical axes, then name players who played for both clubs.
- Nationality x League: Match 3 national teams against 1 domestic league.
- 1v1 or Solo: Play locally with a friend on the same screen or play against Atlas AI.
- Difficulty: Easy, Medium, and Hard options change how well-known the selected clubs and player combinations are.
- Turn Rules: Each footballer can only be used once per round. A wrong guess or passing your turn gives control to the other player.

Features

- Interactive HTML5 canvas world map with zoom, pan, region shortcuts (World, Europe, Americas, Asia), search bar, and an Auto-Fill Remaining button.
- Built-in How to Play walkthrough overlay for new players.
- End-of-round summary with Web Audio whistle sounds and a Show Possible Answers button to check all valid players for every cell.

Project Files

- index.html: Main page layout, top bar, and guess modal
- styles.css: Layout, grid design, and responsive styles
- data.js: Countries, leagues, clubs, and player database
- app.js: Core game logic, map rendering, search autocomplete, and AI opponent
- tutorial.js: Step-by-step How to Play guide
- victory.js: Win line animation, match end banner, sound effects, and possible answers view
