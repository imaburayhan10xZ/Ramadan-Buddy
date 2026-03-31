import { Coordinates, CalculationMethod, PrayerTimes, Madhab } from 'adhan';

export interface PrayerTiming {
  fajr: string;
  sunrise: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  sehri: string; // Alias for Fajr
  iftar: string; // Alias for Maghrib
  nextSehri: string;
  timezone: string;
  hijri: string; // New Dynamic Date
}

const formatTo12Hour = (time24: string) => {
    if (!time24) return "";
    const cleanTime = time24.split(' ')[0]; 
    const [hoursStr, minutesStr] = cleanTime.split(':');
    let hours = parseInt(hoursStr);
    const minutes = minutesStr;
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
};

const formatAdhanDate = (date: Date, timeZone: string) => {
  return date.toLocaleTimeString('en-US', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true,
    timeZone: timeZone 
  });
};

export const getPrayerTimes = async (lat: number, lng: number): Promise<PrayerTiming | null> => {
    // 1. Offline Calculation (Adhan.js)
    const calcOffline = () => {
        try {
            const coordinates = new Coordinates(lat, lng);
            const date = new Date();
            const params = CalculationMethod.Karachi(); 
            params.madhab = Madhab.Hanafi;
            
            const prayerTimes = new PrayerTimes(coordinates, date, params);
            
            const tomorrow = new Date(date);
            tomorrow.setDate(date.getDate() + 1);
            const prayerTimesTomorrow = new PrayerTimes(coordinates, tomorrow, params);

            // Intl Hijri approximation
            const hijriDate = new Intl.DateTimeFormat('en-US-u-ca-islamic', {
                day: 'numeric', month: 'long', year: 'numeric'
            }).format(date);

            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;

            return {
                fajr: formatAdhanDate(prayerTimes.fajr, timeZone),
                sunrise: formatAdhanDate(prayerTimes.sunrise, timeZone),
                dhuhr: formatAdhanDate(prayerTimes.dhuhr, timeZone),
                asr: formatAdhanDate(prayerTimes.asr, timeZone),
                maghrib: formatAdhanDate(prayerTimes.maghrib, timeZone),
                isha: formatAdhanDate(prayerTimes.isha, timeZone),
                sehri: formatAdhanDate(prayerTimes.fajr, timeZone),
                iftar: formatAdhanDate(prayerTimes.maghrib, timeZone),
                nextSehri: formatAdhanDate(prayerTimesTomorrow.fajr, timeZone),
                timezone: timeZone,
                hijri: hijriDate
            };
        } catch (e) {
            console.error("Adhan calculation failed", e);
            return null;
        }
    };

    try {
        const timestamp = Math.floor(Date.now() / 1000);
        
        // Add timeout to fetch to prevent hanging
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000); // 4s timeout

        const response = await fetch(`https://api.aladhan.com/v1/timings/${timestamp}?latitude=${lat}&longitude=${lng}&school=1`, {
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        
        if (!response.ok) throw new Error("API Error");

        const data = await response.json();
        
        if (data.code !== 200) throw new Error("API Data Error");

        const t = data.data.timings;
        const meta = data.data.meta;
        const hijriData = data.data.date.hijri;
        
        // Construct Hijri Date String (e.g., "1 Ramadan 1446")
        const hijriString = `${hijriData.day} ${hijriData.month.en} ${hijriData.year}`;

        // Fetch Next Day for Next Sehri
        let nextSehriVal = formatTo12Hour(t.Fajr); // Fallback

        try {
            const tomTimestamp = timestamp + 86400; 
            const tomResponse = await fetch(`https://api.aladhan.com/v1/timings/${tomTimestamp}?latitude=${lat}&longitude=${lng}&school=1`, {
                 signal: controller.signal
            });
            const tomData = await tomResponse.json();
            if(tomData.code === 200) {
                 nextSehriVal = formatTo12Hour(tomData.data.timings.Fajr);
            }
        } catch(e) {
            // ignore secondary fetch failure
        }

        return {
            fajr: formatTo12Hour(t.Fajr),
            sunrise: formatTo12Hour(t.Sunrise),
            dhuhr: formatTo12Hour(t.Dhuhr),
            asr: formatTo12Hour(t.Asr),
            maghrib: formatTo12Hour(t.Maghrib),
            isha: formatTo12Hour(t.Isha),
            sehri: formatTo12Hour(t.Fajr),
            iftar: formatTo12Hour(t.Maghrib),
            nextSehri: nextSehriVal,
            timezone: meta.timezone,
            hijri: hijriString
        };
    } catch (error) {
        console.warn("Prayer API Error, switching to offline mode:", error);
        return calcOffline();
    }
};