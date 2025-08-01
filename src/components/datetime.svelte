<script>
  const eventTitle = "Eddy & Vanessa's Sangjit Ceremony";
  const location = "Jakarta, Indonesia";
  const startDateTime = new Date("2025-08-18T11:30:00+07:00");
  const endDateTime = new Date("2025-08-18T15:00:00+07:00");

  function toGoogleCalendarDate(date) {
    return date.toISOString().replace(/-|:|\.\d\d\d/g, '');
  }

  const calendarUrl = `https://www.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(eventTitle)}&dates=${toGoogleCalendarDate(startDateTime)}/${toGoogleCalendarDate(endDateTime)}&location=${encodeURIComponent(location)}&sf=true&output=xml`;
</script>

<div class="w-full aspect-square max-auto bg-deepred text-[#FFF1E2] p-6 rounded-lg shadow-md flex flex-col items-center space-y-8">
  <div class="text-center">
    <p class="font-english uppercase">Date and Time</p>
    <p class="font-chinese">日期和时间</p>
    <hr class="mt-4 mb-8">
  </div>

  <div class="text-center">
    <h3 class="font-['Newsreader',serif] font-light text-[36px]">Saturday, 18 August</h3>
    <h3 class="font-['Newsreader',serif] font-light text-[36px]">11.30 - 15.00</h3>
  </div>

  <a
    href={calendarUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="bg-[#361310] text-[#FFF1E2] text-sm px-12 py-4 rounded-full font-english uppercase  hover:bg-[#5a1c14] transition"
  >
    + Save the Date
  </a>
</div>