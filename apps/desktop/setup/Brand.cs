// Shared look of LeadsGhr's small Windows programs (design 3A): colours, Instrument Sans fonts embedded
// as resources and rounded shapes. C# 5 (see build-setup.ps1).
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
