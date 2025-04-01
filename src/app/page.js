// メタデータの設定（サーバーコンポーネント用）
export const metadata = {
  title: 'TL Planner - Blue Archive',
  description: 'Blue Archive用のタイムライン作成支援ツール',
};

// クライアントコンポーネントを別ファイルに移動
import HomeClient from './HomeClient';

export default function Home() {
  return <HomeClient />;
}
