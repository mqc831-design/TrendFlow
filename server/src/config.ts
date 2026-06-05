import dotenv from 'dotenv';
dotenv.config();

export const env = {
  PORT: parseInt(process.env.PORT || '3001', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || '',
  WEIBO_API_URL: process.env.WEIBO_API_URL || '',
  ZHIHU_API_URL: process.env.ZHIHU_API_URL || '',
  BILIBILI_API_URL: process.env.BILIBILI_API_URL || '',
};
