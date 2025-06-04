import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MindmapDialog } from './mindmap-dialog';

describe('MindmapDialog', () => {
  let component: MindmapDialog;
  let fixture: ComponentFixture<MindmapDialog>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MindmapDialog]
    })
    .compileComponents();

    fixture = TestBed.createComponent(MindmapDialog);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
