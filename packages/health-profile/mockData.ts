import { HealthProfile } from './types';

export const mockInitialHealthProfile: HealthProfile = {
  user: {
    id: 'user-togg-001',
    displayName: 'Ahmet Yılmaz',
    truId: 'TRU-8924-IST',
    ageRange: '36-50',
    preferredCity: 'İstanbul',
    preferredConsultationType: 'ALL',
    consent: {
      cameraConsentGiven: true,
      microphoneConsentGiven: true,
      healthDataStorageConsentGiven: true,
      doctorSharingConsentGiven: true,
      consentTimestamp: '2026-09-01T10:00:00Z'
    }
  },
  visionHistory: [
    {
      id: 'vis-prev-001',
      date: '2026-08-15T14:30:00Z',
      acuityRightLogMAR: 0.05,
      acuityLeftLogMAR: 0.05,
      acuityRightSnellen: '20/22',
      acuityLeftSnellen: '20/22',
      contrastSensitivityLogCS: 1.85,
      calibratedDistanceCm: 55,
      comparisonNote: 'Baz çizgi değerlendirmesi tamamlandı. Ölçüm değerleri normal referans aralığında.',
      ophthalmologistReferralRecommended: false
    },
    {
      id: 'vis-recent-002',
      date: '2026-09-18T09:15:00Z',
      acuityRightLogMAR: 0.18,
      acuityLeftLogMAR: 0.08,
      acuityRightSnellen: '20/30',
      acuityLeftSnellen: '20/24',
      contrastSensitivityLogCS: 1.55,
      calibratedDistanceCm: 56,
      comparisonNote: 'Önceki ölçümünüze göre sağ göz kontrast hassasiyetinizde ve keskinlik değerinizde değişim gözlendi.',
      ophthalmologistReferralRecommended: true
    }
  ],
  skinHistory: [
    {
      id: 'skin-prev-001',
      date: '2026-08-10T17:00:00Z',
      regions: {
        forehead: { rednessScore: 18, pigmentationScore: 22, textureVariance: 15, changeFromBaselinePct: 0 },
        rightCheek: { rednessScore: 20, pigmentationScore: 25, textureVariance: 18, changeFromBaselinePct: 0 },
        leftCheek: { rednessScore: 21, pigmentationScore: 24, textureVariance: 17, changeFromBaselinePct: 0 },
        nose: { rednessScore: 25, pigmentationScore: 19, textureVariance: 22, changeFromBaselinePct: 0 },
        chin: { rednessScore: 19, pigmentationScore: 20, textureVariance: 16, changeFromBaselinePct: 0 },
        periorbital: { rednessScore: 15, pigmentationScore: 30, textureVariance: 20, changeFromBaselinePct: 0 }
      },
      overallComparisonNote: 'İlk cilt referans taraması kaydedildi.',
      dermatologistReferralRecommended: false
    },
    {
      id: 'skin-recent-002',
      date: '2026-09-17T18:40:00Z',
      regions: {
        forehead: { rednessScore: 22, pigmentationScore: 23, textureVariance: 16, changeFromBaselinePct: 4 },
        rightCheek: { rednessScore: 38, pigmentationScore: 26, textureVariance: 32, changeFromBaselinePct: 24 },
        leftCheek: { rednessScore: 23, pigmentationScore: 25, textureVariance: 19, changeFromBaselinePct: 6 },
        nose: { rednessScore: 26, pigmentationScore: 20, textureVariance: 21, changeFromBaselinePct: 2 },
        chin: { rednessScore: 21, pigmentationScore: 21, textureVariance: 17, changeFromBaselinePct: 3 },
        periorbital: { rednessScore: 19, pigmentationScore: 34, textureVariance: 24, changeFromBaselinePct: 9 }
      },
      overallComparisonNote: 'Önceki taramanıza kıyasla sağ yanak bölgesinde kızarıklık ve doku görünümünde %24 belirgin değişim gözlendi.',
      dermatologistReferralRecommended: true
    }
  ],
  mentalSessions: [
    {
      sessionId: 'men-001',
      date: '2026-09-14T08:30:00Z',
      durationSeconds: 240,
      moodBefore: 'STRESSED',
      moodAfter: 'FOCUSED',
      recurringThemes: ['iş yoğunluğu', 'toplantı trafiği'],
      summaryText: 'Sabah trafiğinde yoğun iş temposu üzerine konuşuldu. Kısa odaklanma desteği sağlandı.',
      clinicalEscalationSuggested: false
    },
    {
      sessionId: 'men-002',
      date: '2026-09-19T19:10:00Z',
      durationSeconds: 380,
      moodBefore: 'TIRED',
      moodAfter: 'TIRED',
      recurringThemes: ['uyku düzensizliği', 'süregelen yorgunluk', 'stres'],
      summaryText: 'Son 4 seans boyunca uyku kalitesi ve kronikleşen yorgunluk hissi tekrar eden ortak tema olarak öne çıktı.',
      clinicalEscalationSuggested: true,
      suggestedActionNote: 'Son görüşmelerinizde uyku ve stres temalarının tekrar ettiği gözlemlendi. Bir klinik psikolog ile görüşmek faydalı olabilir.'
    }
  ],
  activeReferrals: [
    {
      id: 'ref-001',
      specialty: 'Dermatoloji',
      providerName: 'Doç. Dr. Selin Kaya',
      title: 'Dermatoloji Uzmanı',
      clinicName: 'Acıbadem Altunizade Hastanesi',
      locationLabel: 'Altunizade, Üsküdar',
      isOnline: false,
      dateTime: '2026-09-22T18:20:00',
      displayTime: 'Yarın (Salı) 18:20',
      travelTimeMin: 14,
      calendarConflict: false,
      bookingStatus: 'PENDING_USER_CONFIRMATION',
      bookingUrl: 'https://www.doktortakvimi.com/demo/dr-selin-kaya'
    },
    {
      id: 'ref-002',
      specialty: 'Göz Hastalıkları',
      providerName: 'Prof. Dr. Emre Demir',
      title: 'Göz Hastalıkları & Retina',
      clinicName: 'Dünyagöz Etiler',
      locationLabel: 'Etiler, Beşiktaş',
      isOnline: false,
      dateTime: '2026-09-23T17:45:00',
      displayTime: 'Çarşamba 17:45',
      travelTimeMin: 24,
      calendarConflict: false,
      bookingStatus: 'AVAILABLE',
      bookingUrl: 'https://www.doktortakvimi.com/demo/dr-emre-demir'
    },
    {
      id: 'ref-003',
      specialty: 'Klinik Psikoloji',
      providerName: 'Uzm. Psk. Zeynep Arslan',
      title: 'Klinik Psikolog & Bilişsel Terapist',
      clinicName: 'Online Görüşme Odası',
      locationLabel: 'Online Danışmanlık',
      isOnline: true,
      dateTime: '2026-09-23T20:00:00',
      displayTime: 'Çarşamba 20:00',
      travelTimeMin: 0,
      calendarConflict: false,
      bookingStatus: 'AVAILABLE',
      bookingUrl: 'https://www.doktorsitesi.com/demo/psk-zeynep-arslan'
    }
  ],
  lastUpdated: '2026-09-21T01:00:00Z'
};
