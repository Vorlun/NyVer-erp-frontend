<template>
  <div class="relative w-full h-full min-h-115 flex items-center justify-center select-none overflow-hidden">
    <svg
      viewBox="0 0 680 620"
      class="w-full max-w-140 h-auto drop-shadow-xl"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <!-- Lamp Light Gradient Beam -->
        <linearGradient id="lampBeam" x1="435" y1="230" x2="310" y2="400" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.32" />
          <stop offset="60%" stop-color="#ffffff" stop-opacity="0.12" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.0" />
        </linearGradient>

        <!-- Floor Gradient -->
        <radialGradient id="floorGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95" />
          <stop offset="85%" stop-color="#e2e8f0" stop-opacity="0.9" />
          <stop offset="100%" stop-color="#cbd5e1" stop-opacity="0" />
        </radialGradient>

        <!-- Desk Highlight Gradient -->
        <linearGradient id="deskEdgeGrad" x1="120" y1="0" x2="520" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stop-color="#2563eb" />
          <stop offset="50%" stop-color="#3b82f6" />
          <stop offset="100%" stop-color="#1d4ed8" />
        </linearGradient>

        <!-- Window Blinds Gradient -->
        <linearGradient id="blindGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.16" />
          <stop offset="100%" stop-color="#ffffff" stop-opacity="0.06" />
        </linearGradient>
      </defs>

      <!-- ================= BACKGROUND ROOM ELEMENTS ================= -->
      <!-- Left Whiteboard on Wall -->
      <rect x="70" y="140" width="86" height="175" rx="3" fill="#202e4d" stroke="#ffffff" stroke-opacity="0.35" stroke-width="1.8" />
      <rect x="78" y="150" width="70" height="155" rx="2" fill="#ffffff" fill-opacity="0.82" />

      <!-- Center Large Window Frame -->
      <rect x="195" y="105" width="220" height="380" rx="3" fill="#1b2848" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" />
      <!-- Window Center Divider -->
      <line x1="305" y1="105" x2="305" y2="485" stroke="#ffffff" stroke-opacity="0.3" stroke-width="2" />
      <!-- Window Left Translucent Blind -->
      <rect x="202" y="112" width="96" height="366" fill="url(#blindGrad)" />
      <!-- Window Right Translucent Blind -->
      <rect x="312" y="112" width="96" height="366" fill="url(#blindGrad)" />
      <!-- Window Sill Line -->
      <line x1="185" y1="120" x2="425" y2="120" stroke="#ffffff" stroke-opacity="0.25" stroke-width="2" />

      <!-- Floor Oval Ellipse -->
      <ellipse cx="330" cy="542" rx="260" ry="24" fill="url(#floorGrad)" />

      <!-- ================= WHITE WOODEN STOOL (LEFT) ================= -->
      <g id="woodenStool">
        <!-- Legs -->
        <polygon points="120,432 108,525 119,525 128,432" fill="#f8fafc" />
        <polygon points="135,432 138,525 147,525 142,432" fill="#e2e8f0" />
        <polygon points="160,432 170,525 180,525 168,432" fill="#f8fafc" />
        <!-- Crossbars -->
        <rect x="114" y="475" width="58" height="6" rx="2" fill="#e2e8f0" />
        <!-- Stool Seat Top -->
        <rect x="110" y="420" width="72" height="14" rx="4" fill="#f1f5f9" />
        <ellipse cx="146" cy="420" rx="36" ry="8" fill="#ffffff" />
      </g>

      <!-- ================= STUDENT CHAIR (BEHIND DESK) ================= -->
      <g id="chair">
        <!-- Chair Backrest -->
        <rect x="345" y="380" width="12" height="130" rx="4" fill="#334155" />
        <rect x="390" y="380" width="10" height="130" rx="4" fill="#334155" />
        <rect x="335" y="390" width="70" height="10" rx="3" fill="#cbd5e1" />
      </g>

      <!-- ================= STUDENT BODY (BEHIND TABLETOP) ================= -->
      <g id="student">
        <!-- Blue Trousers (Pelvis & Legs) -->
        <!-- Left leg / thigh -->
        <path d="M 285 385 Q 295 440 280 490 L 305 495 Q 320 445 315 385 Z" fill="#2563eb" />
        <!-- Right leg / thigh (crossed / forward) -->
        <path d="M 310 380 Q 360 415 365 490 L 390 488 Q 380 410 345 375 Z" fill="#1d4ed8" />
        <!-- Bright Blue Pants Front -->
        <path d="M 285 380 C 295 420 335 440 370 420 C 375 445 360 480 345 520 L 325 515 C 335 480 340 450 310 435 C 295 460 285 490 280 525 L 260 520 C 270 480 275 425 285 380 Z" fill="#2563eb" />

        <!-- Rolled up pants cuffs -->
        <rect x="258" y="520" width="24" height="6" rx="2" fill="#ffffff" />
        <rect x="323" y="515" width="24" height="6" rx="2" fill="#ffffff" />

        <!-- Black Shoes -->
        <path d="M 258 526 C 255 538 245 544 260 546 C 278 548 285 540 280 526 Z" fill="#0f172a" />
        <path d="M 323 521 C 322 534 330 542 344 542 C 356 542 355 530 345 521 Z" fill="#0f172a" />

        <!-- Student Torso / Dark Charcoal T-shirt -->
        <path d="M 315 280 C 295 300 290 340 290 385 C 315 390 355 390 375 380 C 375 340 365 295 350 280 Z" fill="#334155" />

        <!-- Student Left Arm / Shoulder -->
        <path d="M 350 280 C 370 290 378 315 370 345 C 362 355 340 355 332 340 Z" fill="#334155" />

        <!-- Neck & Skin tone -->
        <path d="M 326 265 L 340 265 L 340 285 L 326 285 Z" fill="#fed7aa" />

        <!-- Head -->
        <ellipse cx="334" cy="245" rx="20" ry="24" fill="#fed7aa" />

        <!-- Friendly Face Features -->
        <!-- Eye -->
        <circle cx="327" cy="242" r="2.2" fill="#1e293b" />
        <!-- Eyebrow -->
        <path d="M 323 236 Q 328 234 332 236" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" fill="none" />
        <!-- Nose -->
        <path d="M 323 243 Q 320 247 324 249" stroke="#fba772" stroke-width="1.6" fill="none" />
        <!-- Smiling Mouth -->
        <path d="M 324 254 Q 330 259 336 254" stroke="#1e293b" stroke-width="1.8" stroke-linecap="round" fill="none" />
        <!-- Ear -->
        <ellipse cx="348" cy="246" rx="4.5" ry="6.5" fill="#fba772" />

        <!-- Black Hair with modern swoop -->
        <path d="M 314 242 C 314 220 330 212 346 215 C 358 217 362 230 354 242 C 350 236 342 232 334 233 C 326 234 318 238 314 242 Z" fill="#0f172a" />
        <path d="M 320 226 C 308 230 306 242 312 248 C 316 244 322 242 328 244 Z" fill="#0f172a" />

        <!-- White Earphone & Thin Cord -->
        <circle cx="346" cy="246" r="3" fill="#ffffff" />
        <path d="M 346 248 Q 348 275 338 300 Q 330 320 332 340" stroke="#ffffff" stroke-width="1.5" fill="none" stroke-linecap="round" />

        <!-- Student Right Arm (Drawing / Writing with Pen) -->
        <path d="M 295 300 C 285 315 270 335 285 348 C 298 355 312 342 320 335" stroke="#fed7aa" stroke-width="12" stroke-linecap="round" fill="none" />
        <path d="M 295 300 C 288 315 278 335 292 345" stroke="#334155" stroke-width="14" stroke-linecap="round" fill="none" />
        <!-- Pen in Hand -->
        <line x1="272" y1="344" x2="265" y2="354" stroke="#0f172a" stroke-width="2.5" stroke-linecap="round" />
      </g>

      <!-- ================= STUDY DESK ================= -->
      <g id="desk">
        <!-- Desk Back Legs -->
        <polygon points="180,350 172,525 182,525 190,350" fill="#1e293b" />
        <polygon points="450,350 442,525 452,525 460,350" fill="#1e293b" />

        <!-- Tabletop Frame Underneath -->
        <rect x="150" y="348" width="330" height="14" rx="2" fill="#1e293b" />

        <!-- Desk Front Legs -->
        <polygon points="160,355 146,540 160,540 172,355" fill="#0f172a" />
        <polygon points="460,355 474,540 460,540 448,355" fill="#0f172a" />

        <!-- Main Tabletop Plate -->
        <polygon points="135,348 495,348 480,360 150,360" fill="#253761" />

        <!-- Bright Electric Blue Top Edge (Iconic Detail from user screenshot) -->
        <rect x="135" y="344" width="360" height="7" rx="3" fill="url(#deskEdgeGrad)" />
      </g>

      <!-- ================= OBJECTS ON DESK ================= -->
      <!-- Left: Stack of Blue Books -->
      <g id="bookStack">
        <!-- Bottom Book 1 -->
        <rect x="160" y="324" width="95" height="15" rx="3" fill="#1e40af" />
        <rect x="164" y="327" width="88" height="9" rx="1" fill="#ffffff" />
        <rect x="160" y="324" width="16" height="15" rx="2" fill="#1e3a8a" />

        <!-- Book 2 -->
        <rect x="162" y="310" width="90" height="14" rx="3" fill="#2563eb" />
        <rect x="166" y="313" width="83" height="8" rx="1" fill="#ffffff" />
        <rect x="162" y="310" width="14" height="14" rx="2" fill="#1d4ed8" />

        <!-- Book 3 -->
        <rect x="165" y="297" width="84" height="13" rx="3" fill="#3b82f6" />
        <rect x="169" y="300" width="77" height="7" rx="1" fill="#ffffff" />
        <rect x="165" y="297" width="13" height="13" rx="2" fill="#2563eb" />

        <!-- Book 4 -->
        <rect x="170" y="285" width="76" height="12" rx="2" fill="#60a5fa" />
        <rect x="174" y="287" width="69" height="7" rx="1" fill="#ffffff" />
        <rect x="170" y="285" width="12" height="12" rx="2" fill="#3b82f6" />
      </g>

      <!-- Right: Modern Black Desk Lamp -->
      <g id="deskLamp">
        <!-- Lamp Base on Table -->
        <ellipse cx="455" cy="344" rx="16" ry="6" fill="#0f172a" />
        <rect x="451" y="336" width="8" height="8" rx="2" fill="#334155" />

        <!-- Lower Articulated Arm -->
        <line x1="455" y1="338" x2="475" y2="275" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <!-- Elbow Joint -->
        <circle cx="475" cy="275" r="4.5" fill="#334155" />

        <!-- Upper Articulated Arm (Angled left towards student) -->
        <line x1="475" y1="275" x2="425" y2="230" stroke="#0f172a" stroke-width="5" stroke-linecap="round" />
        <!-- Head Joint -->
        <circle cx="425" cy="230" r="4" fill="#334155" />

        <!-- Lamp Shade (Angled cone pointing down-left) -->
        <polygon points="415,215 435,225 410,256 385,242" fill="#0f172a" />
        <ellipse cx="398" cy="249" rx="14" ry="7" fill="#f8fafc" />

        <!-- Light Glow Cone shining down on student & desk -->
        <polygon points="398,249 240,344 470,344" fill="url(#lampBeam)" />
      </g>
    </svg>
  </div>
</template>
