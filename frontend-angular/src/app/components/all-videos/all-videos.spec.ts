import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AllVideos } from './all-videos';

describe('AllVideos', () => {
  let component: AllVideos;
  let fixture: ComponentFixture<AllVideos>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AllVideos]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AllVideos);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
