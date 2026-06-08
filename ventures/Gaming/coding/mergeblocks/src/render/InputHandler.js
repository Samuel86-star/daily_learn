// ============================================================
// InputHandler — 屏幕坐标 → 设计坐标 → 棋盘局部坐标
// PIXI v8: hitArea.contains 收到的已是本地坐标，无需变换
// ============================================================

export class InputHandler {
  constructor(boardContainer, boardRenderer, tileRenderer, designScale, layout, onTap) {
    this.boardContainer = boardContainer;
    this.boardRenderer = boardRenderer;
    this.tileRenderer = tileRenderer;
    this.designScale = designScale;
    this.layout = layout;
    this.onTap = onTap;
    this._setupEvents();
  }

  _setupEvents() {
    const w = this.boardRenderer.width;
    const h = this.boardRenderer.height;

    this.boardContainer.eventMode = 'static';
    this.boardContainer.hitArea = {
      contains(x, y) {
        // PIXI v8 已将坐标转为 boardContainer 本地空间
        return x >= 0 && x <= w && y >= 0 && y <= h;
      }
    };

    this.boardContainer.on('pointerdown', (e) => {
      // e.global 是屏幕坐标，需转为设计坐标
      const dx = e.global.x / this.designScale;
      const dy = e.global.y / this.designScale;
      const lx = dx - this.layout.boardMarginX;
      const ly = dy - this.layout.boardMarginTop;
      const cell = this.boardRenderer.pixelToCell(lx, ly, this.tileRenderer);
      if (cell) {
        this.onTap(cell.row, cell.col);
      }
    });
  }

  destroy() {
    this.boardContainer.off('pointerdown');
  }
}
