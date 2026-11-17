// Shared look of LeadsGhr's small Windows programs (design 3A): colours, Instrument Sans fonts embedded
// as resources, the splash screen's fan lines, and rounded shapes. C# 5 (see build-setup.ps1).
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

        /// <summary>The fan lines of the LeadsGhr splash screen (SVG 1600x700, stretched to width x height).</summary>
        public static void DrawFanLines(Graphics g, float width, float height)
        {
            float sx = width / 1600f, sy = height / 700f;
            for (int y = -80; y <= 820; y += 53)
            {
                float cy = 350 + (y - 350) * 0.16f;
                DrawFan(g, new PointF(0, y), new PointF(320, cy), new PointF(700, 350), sx, sy, false);
                DrawFan(g, new PointF(1600, y), new PointF(1280, cy), new PointF(900, 350), sx, sy, true);
            }
        }

        static void DrawFan(Graphics g, PointF p0, PointF q, PointF p2, float sx, float sy, bool fromRight)
        {
            var c1 = new PointF(p0.X + 2f / 3f * (q.X - p0.X), p0.Y + 2f / 3f * (q.Y - p0.Y));
            var c2 = new PointF(p2.X + 2f / 3f * (q.X - p2.X), p2.Y + 2f / 3f * (q.Y - p2.Y));
            PointF a = new PointF(p0.X * sx, p0.Y * sy), b = new PointF(c1.X * sx, c1.Y * sy), c = new PointF(c2.X * sx, c2.Y * sy), d = new PointF(p2.X * sx, p2.Y * sy);
            float x0 = Math.Min(a.X, d.X) - 1, x1 = Math.Max(a.X, d.X) + 1;
            Color strong = Color.FromArgb(50, Purple), clear = Color.FromArgb(0, Purple);
            using (var brush = new LinearGradientBrush(new PointF(x0, 0), new PointF(x1, 0), fromRight ? clear : strong, fromRight ? strong : clear))
            using (var pen = new Pen(brush, 0.9f))
                g.DrawBezier(pen, a, b, c, d);
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
