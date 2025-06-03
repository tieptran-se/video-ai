import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TranscriptDisplay } from './transcript-display';

describe('TranscriptDisplay', () => {
  let component: TranscriptDisplay;
  let fixture: ComponentFixture<TranscriptDisplay>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TranscriptDisplay]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TranscriptDisplay);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
