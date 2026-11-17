import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export const LOCALES = ['en','es','zh','pt','fr','de','ja','ko','it','ru'] as const;
export type Locale = typeof LOCALES[number];

export const LOCALE_META: Record<Locale,{name:string;native:string;dir:'ltr'}> = {
  en:{name:'English',native:'English',dir:'ltr'}, es:{name:'Spanish',native:'Español',dir:'ltr'},
  zh:{name:'Chinese',native:'中文',dir:'ltr'}, pt:{name:'Portuguese',native:'Português',dir:'ltr'},
  fr:{name:'French',native:'Français',dir:'ltr'}, de:{name:'German',native:'Deutsch',dir:'ltr'},
  ja:{name:'Japanese',native:'日本語',dir:'ltr'}, ko:{name:'Korean',native:'한국어',dir:'ltr'},
  it:{name:'Italian',native:'Italiano',dir:'ltr'}, ru:{name:'Russian',native:'Русский',dir:'ltr'},
};

const en: Record<string,string> = {
  about:'About GeoNote',close:'Close',language:'Language',map:'Map',satellite:'Satellite',random:'Random note',
  location:'Show my location',leaveNote:'Leave a note',share:'Share',report:'Report',delete:'Delete',cancel:'Cancel',
  keepWriting:'Keep writing',discard:'Discard',postNote:'Post note',posting:'Posting…',tryAgain:'Try again',
  loading:'Loading notes…',noNotes:'No notes here yet — leave the first one',zoomIn:'Zoom in for more',
  randomEmpty:'No notes are available yet.',copied:'Link copied',readOnlyPosting:'Read-only · posting unavailable',
  readOnlyBackend:'Read-only · no backend configured',offline:'You’re offline.',noteAbout:'What is this note about?',
  scope:'Note scope',color:'Color',noteText:'Note text',placeholder:'Write something for this place…',
  discardQuestion:'Discard this note?',deleteQuestion:'Delete this note? This can’t be undone.',
  spot:'Spot',spotHint:'Shows when zoomed in close',street:'Street',streetHint:'Shows from city view',
  area:'Area',areaHint:'Shows from anywhere',posted:'Note posted',deleted:'Note deleted',unavailable:'Notes are unavailable right now.',
  mapError:'The map couldn’t load. Check your connection and reload.',at:'at',on:'on',noPlace:'Note',
  postingFailed:'Posting is unavailable right now. You can still read notes.',backendDisabled:'Posting is disabled in this build.',
  aboutText:'A shared map of post-it notes. Tap anywhere, leave a note of up to 280 characters, and everyone can read it. No sign-up, ever.',
  spotStreetAreaTitle:'Spot, street, or area?',rulesTitle:'House rules',privacyTitle:'Privacy',
  rules1:'Be kind. No harassment, hate, threats, or spam.',rules2:'Don’t post private information about anyone: addresses, phone numbers, names.',
  rules3:'Notes are public, anonymous, and can’t be edited. You can delete your own.',rules4:'Use Report on any note that breaks these rules.',
  privacyText:'Your browser gets an anonymous ID so you can delete your own notes.',
};

const t: Partial<Record<Locale,Record<string,string>>> = {
  es:{about:'Acerca de GeoNote',close:'Cerrar',language:'Idioma',map:'Mapa',satellite:'Satélite',random:'Nota aleatoria',location:'Mostrar mi ubicación',leaveNote:'Dejar una nota',share:'Compartir',report:'Reportar',delete:'Eliminar',cancel:'Cancelar',keepWriting:'Seguir escribiendo',discard:'Descartar',postNote:'Publicar nota',posting:'Publicando…',tryAgain:'Intentar de nuevo',loading:'Cargando notas…',noNotes:'Todavía no hay notas aquí — deja la primera',zoomIn:'Amplía para ver más',randomEmpty:'Aún no hay notas disponibles.',copied:'Enlace copiado',noteAbout:'¿De qué trata esta nota?',scope:'Alcance de la nota',color:'Color',placeholder:'Escribe algo para este lugar…',spot:'Punto',street:'Calle',area:'Área',posted:'Nota publicada',deleted:'Nota eliminada'},
  zh:{about:'关于 GeoNote',close:'关闭',language:'语言',map:'地图',satellite:'卫星',random:'随机便签',location:'显示我的位置',leaveNote:'留下便签',share:'分享',report:'举报',delete:'删除',cancel:'取消',keepWriting:'继续编辑',discard:'丢弃',postNote:'发布便签',posting:'发布中…',tryAgain:'重试',loading:'正在加载便签…',noNotes:'这里还没有便签——留下第一张吧',zoomIn:'放大查看更多',randomEmpty:'暂时没有可用便签。',copied:'链接已复制',noteAbout:'这张便签是关于什么的？',scope:'便签范围',color:'颜色',placeholder:'为这个地点写点什么…',spot:'地点',street:'街道',area:'区域',posted:'便签已发布',deleted:'便签已删除'},
  pt:{about:'Sobre o GeoNote',close:'Fechar',language:'Idioma',map:'Mapa',satellite:'Satélite',random:'Nota aleatória',location:'Mostrar minha localização',leaveNote:'Deixar uma nota',share:'Compartilhar',report:'Denunciar',delete:'Excluir',cancel:'Cancelar',keepWriting:'Continuar escrevendo',discard:'Descartar',postNote:'Publicar nota',posting:'Publicando…',tryAgain:'Tentar novamente',loading:'Carregando notas…',noNotes:'Ainda não há notas aqui — deixe a primeira',zoomIn:'Aproxime o zoom para ver mais',randomEmpty:'Ainda não há notas disponíveis.',copied:'Link copiado',noteAbout:'Sobre o que é esta nota?',scope:'Abrangência da nota',color:'Cor',placeholder:'Escreva algo para este lugar…',spot:'Ponto',street:'Rua',area:'Área',posted:'Nota publicada',deleted:'Nota excluída'},
  fr:{about:'À propos de GeoNote',close:'Fermer',language:'Langue',map:'Carte',satellite:'Satellite',random:'Note aléatoire',location:'Afficher ma position',leaveNote:'Laisser une note',share:'Partager',report:'Signaler',delete:'Supprimer',cancel:'Annuler',keepWriting:'Continuer à écrire',discard:'Abandonner',postNote:'Publier la note',posting:'Publication…',tryAgain:'Réessayer',loading:'Chargement des notes…',noNotes:'Aucune note ici pour le moment — soyez le premier',zoomIn:'Zoomez pour en voir plus',randomEmpty:'Aucune note disponible.',copied:'Lien copié',noteAbout:'De quoi parle cette note ?',scope:'Portée de la note',color:'Couleur',placeholder:'Écrivez quelque chose pour cet endroit…',spot:'Point',street:'Rue',area:'Zone',posted:'Note publiée',deleted:'Note supprimée'},
  de:{about:'Über GeoNote',close:'Schließen',language:'Sprache',map:'Karte',satellite:'Satellit',random:'Zufällige Notiz',location:'Meinen Standort anzeigen',leaveNote:'Notiz hinterlassen',share:'Teilen',report:'Melden',delete:'Löschen',cancel:'Abbrechen',keepWriting:'Weiter schreiben',discard:'Verwerfen',postNote:'Notiz posten',posting:'Wird gepostet…',tryAgain:'Erneut versuchen',loading:'Notizen werden geladen…',noNotes:'Noch keine Notizen hier — hinterlasse die erste',zoomIn:'Hineinzoomen für mehr',randomEmpty:'Noch keine Notizen verfügbar.',copied:'Link kopiert',noteAbout:'Worum geht es in dieser Notiz?',scope:'Notizbereich',color:'Farbe',placeholder:'Schreibe etwas für diesen Ort…',spot:'Ort',street:'Straße',area:'Gebiet',posted:'Notiz gepostet',deleted:'Notiz gelöscht'},
  ja:{about:'GeoNoteについて',close:'閉じる',language:'言語',map:'地図',satellite:'衛星',random:'ランダムノート',location:'現在地を表示',leaveNote:'ノートを残す',share:'共有',report:'報告',delete:'削除',cancel:'キャンセル',keepWriting:'書き続ける',discard:'破棄',postNote:'ノートを投稿',posting:'投稿中…',tryAgain:'再試行',loading:'ノートを読み込み中…',noNotes:'ここにはまだノートがありません — 最初のノートを残しましょう',zoomIn:'ズームしてさらに表示',randomEmpty:'利用できるノートがありません。',copied:'リンクをコピーしました',noteAbout:'このノートについて？',scope:'ノートの範囲',color:'色',placeholder:'この場所について書いてみましょう…',spot:'スポット',street:'通り',area:'エリア',posted:'ノートを投稿しました',deleted:'ノートを削除しました'},
  ko:{about:'GeoNote 정보',close:'닫기',language:'언어',map:'지도',satellite:'위성',random:'랜덤 노트',location:'내 위치 표시',leaveNote:'노트 남기기',share:'공유',report:'신고',delete:'삭제',cancel:'취소',keepWriting:'계속 쓰기',discard:'버리기',postNote:'노트 게시',posting:'게시 중…',tryAgain:'다시 시도',loading:'노트 불러오는 중…',noNotes:'아직 이곳에 노트가 없습니다 — 첫 노트를 남겨보세요',zoomIn:'확대해서 더 보기',randomEmpty:'사용 가능한 노트가 없습니다.',copied:'링크가 복사되었습니다',noteAbout:'이 노트는 무엇에 관한 것인가요?',scope:'노트 범위',color:'색상',placeholder:'이 장소에 대해 적어보세요…',spot:'지점',street:'거리',area:'지역',posted:'노트가 게시되었습니다',deleted:'노트가 삭제되었습니다'},
  it:{about:'Informazioni su GeoNote',close:'Chiudi',language:'Lingua',map:'Mappa',satellite:'Satellite',random:'Nota casuale',location:'Mostra la mia posizione',leaveNote:'Lascia una nota',share:'Condividi',report:'Segnala',delete:'Elimina',cancel:'Annulla',keepWriting:'Continua a scrivere',discard:'Scarta',postNote:'Pubblica nota',posting:'Pubblicazione…',tryAgain:'Riprova',loading:'Caricamento note…',noNotes:'Non ci sono ancora note qui — lascia la prima',zoomIn:'Ingrandisci per vederne altre',randomEmpty:'Nessuna nota disponibile.',copied:'Link copiato',noteAbout:'Di cosa parla questa nota?',scope:'Ambito della nota',color:'Colore',placeholder:'Scrivi qualcosa per questo luogo…',spot:'Punto',street:'Strada',area:'Area',posted:'Nota pubblicata',deleted:'Nota eliminata'},
  ru:{about:'О GeoNote',close:'Закрыть',language:'Язык',map:'Карта',satellite:'Спутник',random:'Случайная заметка',location:'Показать моё местоположение',leaveNote:'Оставить заметку',share:'Поделиться',report:'Пожаловаться',delete:'Удалить',cancel:'Отмена',keepWriting:'Продолжить',discard:'Удалить черновик',postNote:'Опубликовать',posting:'Публикация…',tryAgain:'Повторить',loading:'Загрузка заметок…',noNotes:'Здесь пока нет заметок — оставьте первую',zoomIn:'Приблизьте карту, чтобы увидеть больше',randomEmpty:'Доступных заметок пока нет.',copied:'Ссылка скопирована',noteAbout:'О чём эта заметка?',scope:'Область заметки',color:'Цвет',placeholder:'Напишите что-нибудь об этом месте…',spot:'Место',street:'Улица',area:'Район',posted:'Заметка опубликована',deleted:'Заметка удалена'},
};

const translations: Record<Locale,Record<string,string>> = Object.fromEntries(LOCALES.map((l)=>[l,{...en,...(t[l]??{})}])) as Record<Locale,Record<string,string>>;

function detectLocale(): Locale {
  try { const saved=localStorage.getItem('geonote.locale') as Locale|null; if(saved&&LOCALES.includes(saved)) return saved; const browser=navigator.language.toLowerCase(); return LOCALES.find(l=>browser===l||browser.startsWith(l+'-'))??'en'; } catch { return 'en'; }
}
export function translate(locale:Locale,key:string,vars?:Record<string,string|number>):string { let value=translations[locale][key]??key; for(const [k,v] of Object.entries(vars??{})) value=value.replaceAll('{'+k+'}',String(v)); return value; }

type I18nValue={locale:Locale;setLocale:(locale:Locale)=>void;t:(key:string,vars?:Record<string,string|number>)=>string};
const I18nContext=createContext<I18nValue|null>(null);
export function I18nProvider({children}:{children:ReactNode}) {
  const [locale,setLocaleState]=useState<Locale>(()=>detectLocale());
  const setLocale=(next:Locale)=>{setLocaleState(next);try{localStorage.setItem('geonote.locale',next);}catch{}};
  const value=useMemo(()=>({locale,setLocale,t:(key:string,vars?:Record<string,string|number>)=>translate(locale,key,vars)}),[locale]);
  useEffect(()=>{document.documentElement.lang=locale;},[locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
export function useI18n():I18nValue { const value=useContext(I18nContext); if(!value) throw new Error('useI18n must be used inside I18nProvider'); return value; }
