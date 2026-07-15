import buildingImage from '@/public/images/building.jpg';

export default function AuthBrandPanel() {
  return (
    <section
      className="relative flex w-1/2 flex-col justify-center overflow-hidden px-[clamp(2rem,4vw,5rem)] text-white"
      style={{
        backgroundImage: `
          linear-gradient(rgba(0, 26, 88, 0.82), rgba(0, 26, 88, 0.86)),
          url(${buildingImage.src})
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center bottom',
        backgroundRepeat: 'no-repeat',
      }}
    >
      <div className="max-w-2xl">

        {/* Branding */}
        <div className="mb-[clamp(1.5rem,4vw,5rem)] flex flex-wrap items-baseline gap-[clamp(0.5rem,1.5vw,2rem)]">

          <span className="text-[clamp(2.5rem,5vw,6rem)] font-extrabold leading-none tracking-tight text-white">
            OKC
          </span>

          <span className="text-[clamp(1.125rem,1.8vw,2.25rem)] font-medium leading-none tracking-[0.28em] text-[#6ea0ff]">
            PARTNERS
          </span>

        </div>

        {/* Heading */}
        <h1 className="mb-[clamp(1rem,1.8vw,1.75rem)] text-[clamp(1.75rem,3.2vw,3rem)] font-bold leading-tight">
          Your Portfolio,
          <br />

          <span className="text-[#1f6bff]">
            Crystal Clear
          </span>
        </h1>

        {/* Description */}
        <p className="max-w-xl text-[clamp(1rem,1.3vw,1.25rem)] leading-relaxed text-blue-100/90">
          Access real-time portfolio performance, track your P&amp;L,
          and manage your investments through our secure investor portal.
        </p>

      </div>
    </section>
  );
}
