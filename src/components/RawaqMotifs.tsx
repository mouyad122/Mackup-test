import React from 'react';

/**
 * غصن الزيتون الزخرفي للخلفيات والمساحات الواسعة
 */
export const OliveBranchDecoration = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* الساق المنحنية الرئيسية */}
    <path
      d="M40 460 C 130 410, 240 310, 340 180 C 390 120, 440 70, 470 40"
      stroke="currentColor"
      strokeWidth="4"
      strokeLinecap="round"
    />
    {/* أغصان فرعية */}
    <path
      d="M170 375 C 150 340, 115 315, 95 300"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M260 275 C 290 285, 335 280, 360 260"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M330 190 C 310 150, 275 130, 245 120"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    <path
      d="M405 105 C 430 115, 465 105, 485 85"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
    />

    {/* أوراق الزيتون النباتية الطبيعية */}
    <path d="M95 300 C 65 260, 40 270, 35 295 C 35 320, 70 335, 95 300 Z" fill="currentColor" />
    <path d="M125 340 C 95 320, 75 335, 70 355 C 75 380, 110 375, 125 340 Z" fill="currentColor" />
    <path d="M185 320 C 160 270, 130 270, 120 290 C 120 320, 160 345, 185 320 Z" fill="currentColor" />
    <path d="M230 330 C 270 355, 305 340, 310 320 C 300 290, 260 295, 230 330 Z" fill="currentColor" />
    <path d="M260 230 C 230 180, 190 180, 180 205 C 185 240, 235 255, 260 230 Z" fill="currentColor" />
    <path d="M360 260 C 400 270, 430 250, 430 230 C 410 205, 375 220, 360 260 Z" fill="currentColor" />
    <path d="M245 120 C 205 100, 185 120, 190 140 C 205 170, 245 155, 245 120 Z" fill="currentColor" />
    <path d="M345 140 C 375 100, 360 70, 340 70 C 310 80, 315 125, 345 140 Z" fill="currentColor" />
    <path d="M425 80 C 455 50, 485 45, 495 55 C 495 75, 460 95, 425 80 Z" fill="currentColor" />
    <path d="M470 40 C 490 20, 500 25, 495 40 C 485 55, 465 50, 470 40 Z" fill="currentColor" />

    {/* حبات الزيتون المباركة */}
    <ellipse cx="140" cy="355" rx="14" ry="19" transform="rotate(-25 140 355)" fill="currentColor" />
    <ellipse cx="295" cy="275" rx="15" ry="20" transform="rotate(30 295 275)" fill="currentColor" />
    <ellipse cx="320" cy="180" rx="13" ry="18" transform="rotate(-15 320 180)" fill="currentColor" />
  </svg>
);

/**
 * أيقونة غصن الزيتون النضرة والدقيقة مع الحبات والأوراق
 */
export const OliveBranchIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* الساق الرئيسية */}
    <path
      d="M10 54 C16 44, 24 34, 38 22 C45 16, 52 11, 56 9"
      stroke="#556B2F"
      strokeWidth="2.5"
      strokeLinecap="round"
    />
    {/* التفرعات الصغيرة */}
    <path d="M22 41 C20 37, 18 34, 15 32" stroke="#556B2F" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M32 29 C34 25, 36 21, 38 18" stroke="#556B2F" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M42 19 C45 16, 49 14, 52 13" stroke="#556B2F" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M28 34 C31 36, 35 38, 38 41" stroke="#556B2F" strokeWidth="1.8" strokeLinecap="round" />

    {/* ورقة 1 (سفلية) */}
    <path
      d="M15 32 C10 26, 7 26, 5 30 C5 34, 10 36, 15 32 Z"
      fill="#6B7A52"
      stroke="#3F4832"
      strokeWidth="1"
    />
    <path d="M9 30 C11 31, 13 32, 15 32" stroke="#8FA072" strokeWidth="0.8" />

    {/* ورقة 2 (وسطى يسار) */}
    <path
      d="M24 30 C19 23, 14 24, 13 28 C13 33, 19 33, 24 30 Z"
      fill="#5B6846"
      stroke="#3F4832"
      strokeWidth="1"
    />
    <path d="M18 27 C20 28, 22 29, 24 30" stroke="#8FA072" strokeWidth="0.8" />

    {/* ورقة 3 (وسطى يمين) */}
    <path
      d="M38 41 C44 44, 48 42, 48 38 C47 33, 41 35, 38 41 Z"
      fill="#6B7A52"
      stroke="#3F4832"
      strokeWidth="1"
    />
    <path d="M41 38 C43 38, 45 39, 47 40" stroke="#8FA072" strokeWidth="0.8" />

    {/* ورقة 4 (علوية يسار) */}
    <path
      d="M38 18 C39 12, 37 8, 33 8 C30 9, 32 15, 38 18 Z"
      fill="#6B7A52"
      stroke="#3F4832"
      strokeWidth="1"
    />

    {/* ورقة 5 (قمة الغصن) */}
    <path
      d="M56 9 C60 6, 62 7, 61 10 C59 13, 55 12, 56 9 Z"
      fill="#5B6846"
      stroke="#3F4832"
      strokeWidth="1"
    />

    {/* ورقة 6 (علوية يمين) */}
    <path
      d="M52 13 C54 18, 57 20, 59 18 C61 15, 57 13, 52 13 Z"
      fill="#6B7A52"
      stroke="#3F4832"
      strokeWidth="1"
    />

    {/* حبة زيتون أولى (سفلية متدلية بلمعة نضرة) */}
    <ellipse cx="27" cy="42" rx="4.5" ry="6" transform="rotate(-20 27 42)" fill="#363E28" stroke="#B7935F" strokeWidth="1" />
    <ellipse cx="25.5" cy="40.5" rx="1.2" ry="2" transform="rotate(-20 25.5 40.5)" fill="#8FA072" opacity="0.75" />

    {/* حبة زيتون ثانية (علوية ناضجة) */}
    <ellipse cx="44" cy="26" rx="4" ry="5.5" transform="rotate(25 44 26)" fill="#434E33" stroke="#B7935F" strokeWidth="1" />
    <ellipse cx="45" cy="24.5" rx="1" ry="1.8" transform="rotate(25 45 24.5)" fill="#9CB280" opacity="0.75" />
  </svg>
);

/**
 * دفء الحجر الأردني وأقواسه التاريخية (معمار الحجر، حجر المفتاح وأحجار العقد الشعاعية)
 */
export const JordanianStoneArchIcon = ({
  className = "w-10 h-10",
  primaryColor = "#B7935F",
  stoneColor = "#D9C6A8",
}: {
  className?: string;
  primaryColor?: string;
  stoneColor?: string;
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* مداميك الحجر الأردني في القاعدة (قوام البناء) */}
    <rect x="10" y="46" width="12" height="12" rx="1.5" fill={stoneColor} fillOpacity="0.35" stroke={primaryColor} strokeWidth="1.2" />
    <rect x="42" y="46" width="12" height="12" rx="1.5" fill={stoneColor} fillOpacity="0.35" stroke={primaryColor} strokeWidth="1.2" />
    <rect x="8" y="34" width="12" height="12" rx="1.5" fill={stoneColor} fillOpacity="0.25" stroke={primaryColor} strokeWidth="1.2" />
    <rect x="44" y="34" width="12" height="12" rx="1.5" fill={stoneColor} fillOpacity="0.25" stroke={primaryColor} strokeWidth="1.2" />

    {/* خطوط تدرج مداميك الحجر (Masonry joint courses) */}
    <path d="M10 52 L22 52" stroke={primaryColor} strokeWidth="0.8" strokeOpacity="0.6" />
    <path d="M42 52 L54 52" stroke={primaryColor} strokeWidth="0.8" strokeOpacity="0.6" />
    <path d="M8 40 L20 40" stroke={primaryColor} strokeWidth="0.8" strokeOpacity="0.6" />
    <path d="M44 40 L56 40" stroke={primaryColor} strokeWidth="0.8" strokeOpacity="0.6" />

    {/* تيجان الركيزة الحجرية (Imposts) */}
    <path d="M14 34 L22 34" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />
    <path d="M42 34 L50 34" stroke={primaryColor} strokeWidth="2.5" strokeLinecap="round" />

    {/* فتحة القوس الداخلية السلسة */}
    <path
      d="M20 58 L20 34 C20 22, 44 22, 44 34 L44 58"
      stroke={primaryColor}
      strokeWidth="2"
      strokeLinecap="round"
    />

    {/* قوس العقد الخارجي المتصل */}
    <path
      d="M14 34 C14 16, 50 16, 50 34"
      stroke={primaryColor}
      strokeWidth="1.5"
      strokeLinecap="round"
    />

    {/* حجر المفتاح المركزي المتوج للقوس (Keystone) */}
    <polygon points="29,8 35,8 34,19 30,19" fill={stoneColor} fillOpacity="0.65" stroke={primaryColor} strokeWidth="1.4" />
    <circle cx="32" cy="13.5" r="1.5" fill={primaryColor} />

    {/* أحجار العقد الشعاعية لليسار (Voussoirs) */}
    <polygon points="23,10 28,8 29,19 25,20" fill={stoneColor} fillOpacity="0.35" stroke={primaryColor} strokeWidth="1.2" />
    <polygon points="17,14 22,11 24,22 20,24" fill={stoneColor} fillOpacity="0.3" stroke={primaryColor} strokeWidth="1.2" />
    <polygon points="13,21 17,16 21,25 17,29" fill={stoneColor} fillOpacity="0.25" stroke={primaryColor} strokeWidth="1.2" />
    <polygon points="11,29 14,24 19,30 16,34" fill={stoneColor} fillOpacity="0.2" stroke={primaryColor} strokeWidth="1.2" />

    {/* أحجار العقد الشعاعية لليمين (Voussoirs) */}
    <polygon points="36,8 41,10 39,20 35,19" fill={stoneColor} fillOpacity="0.35" stroke={primaryColor} strokeWidth="1.2" />
    <polygon points="42,11 47,14 44,24 40,22" fill={stoneColor} fillOpacity="0.3" stroke={primaryColor} strokeWidth="1.2" />
    <polygon points="47,16 51,21 47,29 43,25" fill={stoneColor} fillOpacity="0.25" stroke={primaryColor} strokeWidth="1.2" />
    <polygon points="50,24 53,29 48,34 45,30" fill={stoneColor} fillOpacity="0.2" stroke={primaryColor} strokeWidth="1.2" />

    {/* عتبة القوس السفلية */}
    <path d="M12 58 L52 58" stroke={primaryColor} strokeWidth="2" strokeLinecap="round" />
  </svg>
);

/**
 * خيوط التطريز التراثية الأصيلة (غرزة الصليب، الوردة الفلسطينية والأردنية وألوان الحرير التراثي)
 */
export const TatreezEmbroideryIcon = ({ className = "w-10 h-10" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* خلفية قماش الكتان التراثي بنسيج ناعم */}
    <rect x="6" y="6" width="52" height="52" rx="10" fill="#FDFBF7" stroke="#E9DDCC" strokeWidth="1.2" strokeDasharray="3 3" />

    {/* خريطة غرز الصليب التراثية المتقاطعة (Cross-Stitch Rosette) */}
    <g strokeLinecap="square">
      {/* قلب الوردة المطرز بالذهب القرمزي */}
      <path d="M30 32 L34 32 M32 30 L32 34" stroke="#C9A24D" strokeWidth="2.5" />
      <path d="M30 30 L34 34 M34 30 L30 34" stroke="#A61E22" strokeWidth="2" />

      {/* بتلات الوردة الرئيسية - أحمر قاني كلاسيكي */}
      <path d="M30 22 L34 26 M34 22 L30 26" stroke="#A61E22" strokeWidth="2.2" />
      <path d="M30 38 L34 42 M34 38 L30 42" stroke="#A61E22" strokeWidth="2.2" />
      <path d="M22 30 L26 34 M26 30 L22 34" stroke="#A61E22" strokeWidth="2.2" />
      <path d="M38 30 L42 34 M42 30 L38 34" stroke="#A61E22" strokeWidth="2.2" />

      {/* بتلات خيوط الزيتوني التراثية في الزوايا */}
      <path d="M24 24 L28 28 M28 24 L24 28" stroke="#3F4832" strokeWidth="2.2" />
      <path d="M36 24 L40 28 M40 24 L36 28" stroke="#3F4832" strokeWidth="2.2" />
      <path d="M24 36 L28 40 M28 36 L24 40" stroke="#3F4832" strokeWidth="2.2" />
      <path d="M36 36 L40 40 M40 36 L36 40" stroke="#3F4832" strokeWidth="2.2" />

      {/* نجوم الأطراف بخيوط القصب الذهبية */}
      <path d="M32 14 L32 18 M30 16 L34 16" stroke="#C9A24D" strokeWidth="2" />
      <path d="M32 46 L32 50 M30 48 L34 48" stroke="#C9A24D" strokeWidth="2" />
      <path d="M14 32 L18 32 M16 30 L16 34" stroke="#C9A24D" strokeWidth="2" />
      <path d="M46 32 L50 32 M48 30 L48 34" stroke="#C9A24D" strokeWidth="2" />

      {/* غرز التطريز في الزوايا المحيطة */}
      <path d="M18 18 L22 22 M22 18 L18 22" stroke="#A61E22" strokeWidth="1.8" />
      <path d="M42 18 L46 22 M46 18 L42 22" stroke="#A61E22" strokeWidth="1.8" />
      <path d="M18 42 L22 46 M22 42 L18 46" stroke="#A61E22" strokeWidth="1.8" />
      <path d="M42 42 L46 46 M46 42 L42 46" stroke="#A61E22" strokeWidth="1.8" />
    </g>

    {/* لمسة بريق في المركز */}
    <polygon points="32,27 37,32 32,37 27,32" fill="#A61E22" fillOpacity="0.12" stroke="#A61E22" strokeWidth="0.8" />
    <circle cx="32" cy="32" r="2.2" fill="#C9A24D" />

    {/* انسياب خيط الحرير الذهبي في الأسفل */}
    <path
      d="M12 52 C22 55, 42 55, 52 52"
      stroke="#C9A24D"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeDasharray="4 2"
    />
  </svg>
);

/**
 * النجمة السباعية الأردنية الرسمية المتألقة
 */
export const JordanStarIcon = ({
  className = "w-10 h-10",
  color = "#B7935F",
}: {
  className?: string;
  color?: string;
}) => (
  <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <path
      d="M32 6 L35.8 19.5 L49 14.5 L44.3 27.5 L57.5 32 L44.3 36.5 L49 49.5 L35.8 44.5 L32 58 L28.2 44.5 L15 49.5 L19.7 36.5 L6.5 32 L19.7 27.5 L15 14.5 L28.2 19.5 Z"
      fill={color}
    />
    <circle cx="32" cy="32" r="3" fill="#FFFFFF" fillOpacity="0.85" />
  </svg>
);

export const SevenPointedStar = JordanStarIcon;

export const ArchFrame = ({ className, children }: { className?: string, children?: React.ReactNode }) => (
  <div className={`relative ${className}`}>
    <svg viewBox="0 0 400 500" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute inset-0 w-full h-full pointer-events-none">
      <path d="M50 500 L50 200 C50 100, 150 20, 200 20 C250 20, 350 100, 350 200 L350 500" stroke="currentColor" strokeWidth="2" strokeDasharray="8 8" />
      <path d="M30 500 L30 200 C30 90, 130 0, 200 0 C270 0, 370 90, 370 200 L370 500" stroke="currentColor" strokeWidth="1" />
    </svg>
    <div className="relative z-10 w-full h-full pt-12 pb-8 px-10">
      {children}
    </div>
  </div>
);
