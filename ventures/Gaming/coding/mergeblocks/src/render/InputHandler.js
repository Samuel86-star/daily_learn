// ============================================================
// InputHandler — 屏幕坐标 → 设计坐标 → 棋盘局部坐标
// 事件挂在 boardContainer 上，教程遮罩自然挡住
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
    const self = this;

    this.boardContainer.eventMode = 'static';
    this.boardContainer.hitArea = {
      contains(x, y) {
        const lx = x / self.designScale - self.layout.boardMarginX;
        const ly = y / self.designScale - self.layout.boardMarginTop;
        return lx >= 0 && lx <= w && ly >= 0 && ly <= h;
      }
    };

    this.boardContainer.on('pointerdown', (e) => {
      const px = e.global.x;
      const py = e.global.y;
      const dx = px / this.designScale;
      const dy = py / this.designScale;
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
