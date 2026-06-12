/**
 * Renderer giriş noktası.
 *
 * Önce diller, temalar, menü eylemleri ve özellik panelleri import edilir — her
 * biri import anında kendini ilgili registry'ye kaydeder (İlke 5). Sonra kabuk
 * yüklenir; kabuk registry'leri okuyup temayı/dili uygular ve panelleri
 * yerleştirir. Kabuk özelliklere/temalara/dillere bağımlı değildir.
 */
import './diller/dil';
import './ozellikler/temalar/temalar';
import './ozellikler/dosya/dosya-eylemleri';
import './ozellikler/duzen/duzen-eylemleri';
import './ozellikler/yol-islemleri/yol-eylemleri';
import './ozellikler/yol-islemleri/yol-duzenleme-eylemleri';
import './ozellikler/semboller/sembol-eylemleri';
import './ozellikler/optimize/optimize-eylemleri';
import './ozellikler/donustur/yansit-eylemleri';
import './araclar/tools/sec-araci';
import './araclar/tools/dugum-araci';
import './araclar/tools/sekil-olusturucu-araci';
import './araclar/tools/kalem-araci';
import './araclar/tools/kursun-kalem-araci';
import './araclar/tools/gorsel-araci';
import './araclar/tools/pipet-araci';
import './araclar/tools/sekil-araclari';
import './araclar/tools/ek-sekiller';
import './araclar/tools/el-araci';
import './araclar/tools/yakinlastir-araci';
import './araclar/araclar-cubugu';
import './tuval/tuval-alani';
import './ozellikler/hizalama/hizalama-paneli';
import './ozellikler/ozellik-denetcisi/ozellik-denetcisi-panel';
import './ozellikler/katmanlar/katmanlar-paneli';
import './ozellikler/gecmis/gecmis-paneli';
import './ozellikler/tanimlar-paneli/turler/filtre-turu';
import './ozellikler/tanimlar-paneli/turler/marker-turu';
import './ozellikler/tanimlar-paneli/turler/gradyan-turu';
import './ozellikler/tanimlar-paneli/turler/stil-turu';
import './ozellikler/tanimlar-paneli/turler/desen-turu';
import './ozellikler/tanimlar-paneli/turler/kirpma-turu';
import './ozellikler/tanimlar-paneli/turler/maske-turu';
import './ozellikler/tanimlar-paneli/tanimlar-paneli-panel';
import './ozellikler/zaman-cizelgesi/zaman-cizelgesi-panel';
import './ozellikler/kod/kod-paneli';
import './ozellikler/komut-paleti/komut-paleti';
import './kabuk/uygulama-kabugu';
