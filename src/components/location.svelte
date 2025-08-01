<script>
  const mapsLocation = "Jakarta, Indonesia";

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsLocation)}`;
</script>

<div class="w-full aspect-square mx-auto bg-deepred text-[#FFF1E2] p-6 rounded-lg shadow-md flex flex-col items-center space-y-8">
  <div class="text-center">
    <p class="font-english uppercase">Location</p>
    <p class="font-chinese">日期和时间</p>
    <hr class="mt-4">
  </div>

  <div class="text-center">
    <h3 class="font-['Newsreader',serif] font-light text-[36px] flex-wrap">Hotel Mulia Senayan, Lt. 3 Jl. Asia Afrika, Jakarta Pusat
DKI Jakarta, 17350</h3>
  </div>

  <a
    href={mapsUrl}
    target="_blank"
    rel="noopener noreferrer"
    class="bg-[#361310] text-[#FFF1E2] text-sm px-12 py-4 rounded-full font-english uppercase hover:bg-[#5a1c14] transition"
  >
    + View Location
  </a>
</div>
