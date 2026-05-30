export interface AppleMusicConfig {
  mediaUserToken: string;
  storefront: string;
  autoUpload: boolean;
  rcloneRemote: string;
  updatedAt: Date;
}

export interface IAppleMusicRepository {
  getConfig(): Promise<AppleMusicConfig | null>;
  saveConfig(config: Partial<AppleMusicConfig>): Promise<AppleMusicConfig>;
}