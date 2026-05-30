export interface AppleMusicConfig {
  mediaUserToken: string;
  storefront: string;
  alacFix: boolean;
  autoUpload: boolean;
  rcloneRemote: string;
  lrcFormat: 'lrc' | 'ttml';
  lrcType: 'lyrics' | 'syllable-lyrics';
  language: string;
  tagSortOrder: boolean;
  saveLrcFile: boolean;
  saveArtistCover: boolean;
  useSongInfoForPlaylist: boolean;
  updatedAt: Date;
}

export interface IAppleMusicRepository {
  getConfig(): Promise<AppleMusicConfig | null>;
  saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
}