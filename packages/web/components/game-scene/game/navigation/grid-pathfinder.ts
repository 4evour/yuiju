import { js as EasyStar } from "easystarjs";
import type { SceneRectangleShape } from "../scene-region";

export interface NavigationPoint {
  x: number;
  y: number;
}

interface GridPathfinderConfig {
  width: number;
  height: number;
  cellSize: number;
  actorWidth: number;
  actorHeight: number;
  obstacles: readonly SceneRectangleShape[];
}

interface NavigationCell extends NavigationPoint {
  column: number;
  row: number;
}

const WALKABLE_CELL = 0;
const BLOCKED_CELL = 1;

export class GridPathfinder {
  readonly walkablePoints: readonly NavigationPoint[];

  private readonly cellSize: number;
  private readonly columns: number;
  private readonly rows: number;
  private readonly walkableCells: readonly NavigationCell[];
  private readonly easyStar = new EasyStar();

  constructor(config: GridPathfinderConfig) {
    this.cellSize = config.cellSize;
    this.columns = Math.ceil(config.width / config.cellSize);
    this.rows = Math.ceil(config.height / config.cellSize);

    const actorHalfWidth = config.actorWidth / 2;
    const actorHalfHeight = config.actorHeight / 2;
    const grid: number[][] = [];
    const walkableCells: NavigationCell[] = [];

    for (let row = 0; row < this.rows; row += 1) {
      const gridRow: number[] = [];
      const y = row * config.cellSize + config.cellSize / 2;

      for (let column = 0; column < this.columns; column += 1) {
        const x = column * config.cellSize + config.cellSize / 2;
        const outsideScene =
          x - actorHalfWidth < 0 ||
          x + actorHalfWidth > config.width ||
          y - actorHalfHeight < 0 ||
          y + actorHalfHeight > config.height;
        const intersectsObstacle = config.obstacles.some(
          (obstacle) =>
            x + actorHalfWidth > obstacle.x &&
            x - actorHalfWidth < obstacle.x + obstacle.width &&
            y + actorHalfHeight > obstacle.y &&
            y - actorHalfHeight < obstacle.y + obstacle.height,
        );

        if (outsideScene || intersectsObstacle) {
          gridRow.push(BLOCKED_CELL);
        } else {
          gridRow.push(WALKABLE_CELL);
          walkableCells.push({ x, y, column, row });
        }
      }

      grid.push(gridRow);
    }

    this.walkableCells = walkableCells;
    this.walkablePoints = walkableCells;
    this.easyStar.setGrid(grid);
    this.easyStar.setAcceptableTiles(WALKABLE_CELL);
    this.easyStar.disableDiagonals();
    this.easyStar.setIterationsPerCalculation(1000);
  }

  findPath(
    start: NavigationPoint,
    destination: NavigationPoint,
    onComplete: (path: NavigationPoint[] | null) => void,
  ) {
    const startCell = this.findNearestWalkableCell(start);
    const destinationCell = this.findNearestWalkableCell(destination);

    return this.easyStar.findPath(
      startCell.column,
      startCell.row,
      destinationCell.column,
      destinationCell.row,
      (path: NavigationPoint[] | null) => {
        if (path === null) {
          onComplete(null);
          return;
        }

        const worldPath = path.map(({ x, y }) => ({
          x: x * this.cellSize + this.cellSize / 2,
          y: y * this.cellSize + this.cellSize / 2,
        }));
        onComplete(
          worldPath.filter((point, index) => {
            if (index === 0 || index === worldPath.length - 1) {
              return true;
            }

            const previousPoint = worldPath[index - 1];
            const nextPoint = worldPath[index + 1];
            return !(
              (previousPoint.x === point.x && point.x === nextPoint.x) ||
              (previousPoint.y === point.y && point.y === nextPoint.y)
            );
          }),
        );
      },
    );
  }

  calculate() {
    this.easyStar.calculate();
  }

  cancelPath(pathId: number) {
    this.easyStar.cancelPath(pathId);
  }

  private findNearestWalkableCell(point: NavigationPoint) {
    const column = Math.min(Math.max(Math.floor(point.x / this.cellSize), 0), this.columns - 1);
    const row = Math.min(Math.max(Math.floor(point.y / this.cellSize), 0), this.rows - 1);
    const exactCell = this.walkableCells.find((cell) => cell.column === column && cell.row === row);
    if (exactCell) {
      return exactCell;
    }

    return this.walkableCells.reduce((nearestCell, cell) => {
      const nearestDistance = (nearestCell.x - point.x) ** 2 + (nearestCell.y - point.y) ** 2;
      const cellDistance = (cell.x - point.x) ** 2 + (cell.y - point.y) ** 2;
      return cellDistance < nearestDistance ? cell : nearestCell;
    });
  }
}
