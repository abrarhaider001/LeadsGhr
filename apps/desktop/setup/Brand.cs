// Shared look of LeadsGhr's small Windows programs (design 3A): colours, Instrument Sans fonts embedded
// as resources, the splash screen's dot-grid background, and rounded shapes. C# 5 (see build-setup.ps1).
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;

namespace LeadsGhr.Branding
{
    static class Brand
    {
        public static readonly Color Ink = Color.FromArgb(0x19, 0x0B, 0x2D);
        public static readonly Color Muted = Color.FromArgb(0x67, 0x5E, 0x76);
        public static readonly Color Purple = Color.FromArgb(0x5B, 0x12, 0xC9);
        public static readonly Color Cyan = Color.FromArgb(0x29, 0xCB, 0xEA);
        public static readonly Color Teal = Color.FromArgb(0x1F, 0xA9, 0xC9);
        public static readonly Color Line = Color.FromArgb(0xDF, 0xD9, 0xEC);
        public static readonly Color Track = Color.FromArgb(0xEC, 0xE9, 0xFA);
        public static readonly Color Danger = Color.FromArgb(0xB4, 0x23, 0x18);
        public static readonly Color DangerSoft = Color.FromArgb(0xFD, 0xF0, 0xEF);

        public static Stream Resource(string name)
        {
            Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
            if (s == null) throw new InvalidOperationException("Missing resource " + name);
            return s;
        }

        /// <summary>
        /// The LeadsGhr splash background (packages/app/src/splash-screen.tsx, `.la-splash__dots`): a dot grid coloured
        /// from purple to teal left to right, fading out behind the centre and at the edges, with a soft purple glow.
        /// </summary>
        public static void DrawDotGrid(Graphics g, float width, float height)
        {
            float cx = width / 2f, cy = height / 2f;
            // The glow behind the content.
            float glow = 0.4f * (float)Math.Sqrt(width * width + height * height) / 2f;
            using (var path = new GraphicsPath())
            {
                path.AddEllipse(cx - glow, height * 0.46f - glow, glow * 2, glow * 2);
                using (var brush = new PathGradientBrush(path))
                {
                    brush.CenterPoint = new PointF(cx, height * 0.46f);
                    brush.CenterColor = Color.FromArgb(24, Purple);
                    brush.SurroundColors = new[] { Color.FromArgb(0, Purple) };
                    g.FillPath(brush, path);
                }
            }
            // The dots: the same fade as the CSS mask (an ellipse through the corners; clear inside 22%, full 58%, gone 92%).
            const float step = 14f, dot = 1.15f;
            Color violet = Color.FromArgb(0x8B, 0x5C, 0xF6);
            float rx = cx * 1.4142f, ry = cy * 1.4142f;
            for (float y = step / 2f; y < height; y += step)
                for (float x = step / 2f; x < width; x += step)
                {
                    float dx = (x - cx) / rx, dy = (y - cy) / ry;
                    float d = (float)Math.Sqrt(dx * dx + dy * dy);
                    float fade = d < 0.22f ? 0 : d < 0.58f ? (d - 0.22f) / 0.36f : d < 0.92f ? 1 - (d - 0.58f) / 0.34f : 0;
                    if (fade <= 0.01f) continue;
                    float t = x / width;
                    Color c = t < 0.5f ? Mix(Purple, violet, t * 2) : Mix(violet, Teal, (t - 0.5f) * 2);
                    using (var brush = new SolidBrush(Color.FromArgb((int)(fade * 0.5f * 255), c)))
                        g.FillEllipse(brush, x - dot, y - dot, dot * 2, dot * 2);
                }
        }

        static Color Mix(Color a, Color b, float t)
        {
            return Color.FromArgb((int)(a.R + (b.R - a.R) * t), (int)(a.G + (b.G - a.G) * t), (int)(a.B + (b.B - a.B) * t));
        }

        public static GraphicsPath RoundRect(RectangleF r, float radius)
        {
            float d = Math.Min(radius * 2, Math.Min(r.Width, r.Height));
            var path = new GraphicsPath();
            path.AddArc(r.X, r.Y, d, d, 180, 90);
            path.AddArc(r.Right - d, r.Y, d, d, 270, 90);
            path.AddArc(r.Right - d, r.Bottom - d, d, d, 0, 90);
            path.AddArc(r.X, r.Bottom - d, d, d, 90, 90);
            path.CloseFigure();
            return path;
        }

        /// <summary>Draws a 24x24 line icon (points per stroke) into a box.</summary>
        public static void DrawIcon(Graphics g, RectangleF box, Color color, float[][] strokes)
        {
            float s = box.Width / 24f;
            using (var pen = new Pen(color, 2f * s))
            {
                pen.StartCap = pen.EndCap = LineCap.Round;
                pen.LineJoin = LineJoin.Round;
                foreach (float[] stroke in strokes)
                {
                    var pts = new PointF[stroke.Length / 2];
                    for (int i = 0; i < pts.Length; i++) pts[i] = new PointF(box.X + stroke[i * 2] * s, box.Y + stroke[i * 2 + 1] * s);
                    g.DrawLines(pen, pts);
                }
            }
        }

        public static readonly float[][] TrashIcon = {
            new float[] { 3, 6, 21, 6 }, new float[] { 8, 6, 8, 4, 16, 4, 16, 6 },
            new float[] { 19, 6, 18, 20, 6, 20, 5, 6 }, new float[] { 10, 11, 10, 17 }, new float[] { 14, 11, 14, 17 } };
        public static readonly float[][] TickIcon = { new float[] { 5, 12, 10, 17, 19, 7 } };
    }

    /// <summary>Instrument Sans Regular / SemiBold / Bold loaded from embedded resources.</summary>
    sealed class BrandFonts : IDisposable
    {
        readonly PrivateFontCollection fonts = new PrivateFontCollection();
        readonly List<IntPtr> memory = new List<IntPtr>();
        public FontFamily Regular, SemiBold, Bold;

        public BrandFonts()
        {
            foreach (string name in new[] { "InstrumentSans-Regular.ttf", "InstrumentSans-SemiBold.ttf", "InstrumentSans-Bold.ttf" })
            {
                using (Stream s = Brand.Resource(name))
                {
                    byte[] data = new byte[s.Length];
                    s.Read(data, 0, data.Length);
                    IntPtr ptr = Marshal.AllocCoTaskMem(data.Length);
                    Marshal.Copy(data, 0, ptr, data.Length);
                    fonts.AddMemoryFont(ptr, data.Length);
                    memory.Add(ptr);
                }
            }
            foreach (FontFamily f in fonts.Families)
            {
                // Family names come from the font files; GDI+ may append the style ("Instrument Sans SemiBold SemiBo").
                if (f.Name.StartsWith("Instrument Sans SemiBold")) SemiBold = f;
                else if (f.Name.StartsWith("Instrument Sans Bold")) Bold = f;
                else if (f.Name == "Instrument Sans") Regular = f;
            }
            if (Regular == null) Regular = FontFamily.GenericSansSerif;
            if (SemiBold == null) SemiBold = Regular;
            if (Bold == null) Bold = Regular;
        }

        public void Dispose()
        {
            fonts.Dispose();
            foreach (IntPtr p in memory) Marshal.FreeCoTaskMem(p);
            memory.Clear();
        }
    }
}
