import { Inter, VT323 } from 'next/font/google';
import { headers } from 'next/headers';
import { ThemeProvider } from '@/components/app/theme-provider';
import { cn } from '@/lib/shadcn/utils';
import { getAppConfig, getStyles } from '@/lib/utils';
import '@/styles/globals.css';

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin', 'latin-ext'],
  display: 'swap',
});

const vt323 = VT323({
  variable: '--font-vt323',
  subsets: ['latin', 'latin-ext'],
  weight: '400',
  display: 'swap',
});

interface RootLayoutProps {
  children: React.ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
  const hdrs = await headers();
  const appConfig = await getAppConfig(hdrs);
  const styles = getStyles(appConfig);
  const { pageTitle, pageDescription } = appConfig;

  return (
    <html
      lang="pl"
      suppressHydrationWarning
      className={cn(inter.variable, vt323.variable, 'dark scroll-smooth font-sans antialiased')}
    >
      <head>
        {styles && <style>{styles}</style>}
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
      </head>
      <body className="jutra-scanlines overflow-x-hidden">
        <ThemeProvider attribute="class" defaultTheme="dark" forcedTheme="dark">
          <header className="fixed top-0 left-0 z-50 hidden w-full flex-row items-center justify-between px-8 py-6 md:flex">
            <span
              className="font-mono text-[28px] tracking-[0.18em] text-[color:var(--color-coral)] uppercase"
              style={{ textShadow: '0 0 12px rgba(255, 142, 114, 0.45)' }}
            >
              [JUTRA]
            </span>
            <span className="font-mono text-xs tracking-[0.25em] text-[color:var(--color-mint)] uppercase opacity-70">
              {'> POROZMAWIAJ Z PRZYSZŁYM SOBĄ'}
            </span>
          </header>

          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
