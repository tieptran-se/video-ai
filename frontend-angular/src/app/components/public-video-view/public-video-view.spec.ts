import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicVideoView } from './public-video-view';

describe('PublicVideoView', () => {
  let component: PublicVideoView;
  let fixture: ComponentFixture<PublicVideoView>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicVideoView]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PublicVideoView);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
