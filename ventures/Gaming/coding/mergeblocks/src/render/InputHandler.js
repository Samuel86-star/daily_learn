// ============================================================
// InputHandler — 屏幕坐标 → 设计坐标 → 棋盘局部坐标
// ============================================================

export class InputHandler {
  constructor(app, boardRenderer, tileRenderer, designScale, layout, onTap) {
    this.app = app;
    this.boardRenderer = boardRenderer;
    this.tileRenderer = tileRenderer;
    this.designScale = designScale;     // 设计画布到屏幕的缩放比
    this.layout = layout;
    this.onTap = onTap;
    this._setupEvents();
  }

  _setupEvents() {
    this.app.stage.eventMode = 'static';
    this.app.stage.hitArea = this.app.screen;
    this.app.stage.on('pointerdown', (e) => {
      // 屏幕像素
      const px = e.global.x;
      const py = e.global.y;
      // 屏幕 → 设计坐标
      const dx = px / this.designScale;
      const dy = py / this.designScale;
      // 设计坐标 → 棋盘局部
      const lx = dx - this.layout.boardMarginX;
      const ly = dy - this.layout.boardMarginTop;
      const cell = this.boardRenderer.pixelToCell(lx, ly, this.tileRenderer);
      if (cell) {
        this.onTap(cell.row, cell.col);
      }
    });
  }

  destroy() {
    this.app.stage.off('pointerdown');
  }
}
