import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, ElementRef, Inject, OnDestroy, ViewChild } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Declare the markmap library for TypeScript
declare var markmap: any;

export interface MindmapDialogData {
  markdown: string;
  videoName: string;
}

@Component({
  selector: 'app-mindmap-dialog',
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './mindmap-dialog.html',
  styleUrl: './mindmap-dialog.scss'
})
export class MindmapDialog implements AfterViewInit, OnDestroy {
@ViewChild('markmapDialogContainer') markmapContainer!: ElementRef<SVGSVGElement>;
  private markmapInstance: any;
  isLoadingMarkmap = true;

  constructor(
    public dialogRef: MatDialogRef<MindmapDialog>,
    @Inject(MAT_DIALOG_DATA) public data: MindmapDialogData
  ) {}

  ngAfterViewInit(): void {
    this.renderMarkmap();
  }

  renderMarkmap(): void {
    this.isLoadingMarkmap = true;
    setTimeout(() => {
      if (this.data.markdown && this.markmapContainer?.nativeElement && typeof markmap !== 'undefined') {
        const { Markmap, Transformer } = markmap;
        const transformer = new Transformer();
        
        if (this.markmapInstance && typeof this.markmapInstance.destroy === 'function') {
          this.markmapInstance.destroy();
        }
        this.markmapContainer.nativeElement.innerHTML = '';

        try {
          const { root } = transformer.transform(this.data.markdown);
          const options = { autoFit: false, duration: 500, embedGlobalCSS: true, initialExpandLevel: 2 };
          this.markmapInstance = Markmap.create(this.markmapContainer.nativeElement, options, root);
          if (this.markmapInstance && typeof this.markmapInstance.fit === 'function') {
            setTimeout(() => this.markmapInstance.fit(), 50);
          }
        } catch (e) {
          console.error("Error transforming or creating Markmap in dialog:", e);
        } finally {
            this.isLoadingMarkmap = false;
        }
      } else {
        console.warn("Markmap rendering prerequisites not met in dialog.", {
            markdown: !!this.data.markdown,
            container: !!this.markmapContainer?.nativeElement,
            library: typeof markmap !== 'undefined'
        });
        this.isLoadingMarkmap = false;
      }
    }, 100);
  }

  closeDialog(): void {
    this.dialogRef.close();
  }

  ngOnDestroy(): void {
    if (this.markmapInstance && typeof this.markmapInstance.destroy === 'function') {
      this.markmapInstance.destroy();
    }
  }
}
