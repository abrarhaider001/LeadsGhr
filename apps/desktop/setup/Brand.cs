// Shared look of LeadsGhr's small Windows programs (design 3A): colours (from Tokens.g.cs, generated from
// packages/ui/src/tokens.css), Plus Jakarta Sans fonts embedded
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
        public static readonly Color Ink = Tokens.ColorText;
        public static readonly Color Muted = Tokens.ColorTextMuted;
        public static readonly Color Purple = Tokens.ColorPrimary;
        public static readonly Color Cyan = Tokens.ColorFocus;
        public static readonly Color Teal = Tokens.ColorAccent;
        public static readonly Color Line = Tokens.ColorBorder;
        public static readonly Color Track = Tokens.ColorPrimarySubtle;
        public static readonly Color Danger = Tokens.ColorDanger;
        public static readonly Color DangerSoft = Tokens.ColorDangerSoft;
        public static readonly Color DangerHover = Tokens.ColorDangerHover;
        public static readonly Color PrimaryHover = Tokens.ColorPrimaryHover;
        public static readonly Color PrimarySoft = Tokens.ColorPrimarySoft;
        public static readonly Color PrimaryMuted = Tokens.ColorPrimaryMuted;
        public static readonly Color Surface = Tokens.ColorSurface;
        public static readonly Color OnPrimary = Tokens.ColorOnPrimary;

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

    /// <summary>Plus Jakarta Sans Regular / SemiBold / Bold loaded from embedded resources.</summary>
    sealed class BrandFonts : IDisposable
    {
        readonly PrivateFontCollection fonts = new PrivateFontCollection();
        // The bold file shares the regular family name, so it gets its own collection to stay a separate, real bold face.
        readonly PrivateFontCollection boldFonts = new PrivateFontCollection();
        readonly List<IntPtr> memory = new List<IntPtr>();
        public FontFamily Regular, SemiBold, Bold;
        /// <summary>Style to draw Bold with (Bold when the bold face is the Bold style of its family).</summary>
        public FontStyle BoldStyle = FontStyle.Regular;

        public BrandFonts()
        {
            foreach (string name in new[] { "PlusJakartaSans-Regular.ttf", "PlusJakartaSans-SemiBold.ttf", "PlusJakartaSans-Bold.ttf" })
            {
                using (Stream s = Brand.Resource(name))
                {
                    byte[] data = new byte[s.Length];
                    s.Read(data, 0, data.Length);
                    IntPtr ptr = Marshal.AllocCoTaskMem(data.Length);
                    Marshal.Copy(data, 0, ptr, data.Length);
                    (name.EndsWith("-Bold.ttf") ? boldFonts : fonts).AddMemoryFont(ptr, data.Length);
                    memory.Add(ptr);
                }
            }
            foreach (FontFamily f in fonts.Families)
            {
                // Family names come from the font files; GDI+ may append the style ("Plus Jakarta Sans SemiBold SemiBo").
                if (f.Name.StartsWith("Plus Jakarta Sans SemiBold")) SemiBold = f;
                else if (f.Name.StartsWith("Plus Jakarta Sans Bold")) Bold = f;
                else if (f.Name == "Plus Jakarta Sans") Regular = f;
            }
            if (Regular == null) Regular = FontFamily.GenericSansSerif;
            if (SemiBold == null) SemiBold = Regular;
            if (boldFonts.Families.Length > 0) Bold = boldFonts.Families[0];
            if (Bold == null) Bold = Regular;
            if (!Bold.IsStyleAvailable(FontStyle.Regular) && Bold.IsStyleAvailable(FontStyle.Bold)) BoldStyle = FontStyle.Bold;
        }

        public void Dispose()
        {
            fonts.Dispose();
            boldFonts.Dispose();
            foreach (IntPtr p in memory) Marshal.FreeCoTaskMem(p);
            memory.Clear();
        }
    }
}
