import { ComponentFixture, TestBed } from '@angular/core/testing';

import { VideoUpload } from './video-upload';

describe('VideoUpload', () => {
  let component: VideoUpload;
  let fixture: ComponentFixture<VideoUpload>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VideoUpload]
    })
    .compileComponents();

    fixture = TestBed.createComponent(VideoUpload);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
