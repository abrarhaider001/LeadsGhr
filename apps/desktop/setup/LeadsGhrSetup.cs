// LeadsGhr Setup: the small LeadsGhr-Setup.exe people download.
//
// It shows one branded window (design "3A": white, splash fan lines, logo in rings) while it
//   1. reads latest.yml from the newest GitHub Release,
//   2. downloads the electron-builder installer (LeadsGhr-Installer.exe) and the app package
//      (LeadsGhr-App-x64.nsis.7z) and checks both against the SHA-512 hashes in latest.yml,
//   3. runs the installer silently with that package (/S --force-run --package-file=...), which installs
//      LeadsGhr for the current user and opens it.
// Installed copies never use this program: they update through latest.yml and LeadsGhr-Installer.exe.
//
// Built by build-setup.ps1 with the C# compiler that ships with Windows (.NET Framework 4.x, C# 5),
// so it needs nothing extra on Windows 10/11. Keep the code C# 5 compatible (no $"", ?., nameof, =>).
//
// Options (for testing): --feed <url/>  read latest.yml and files from another location;
//                        --dry-run      download and verify, but do not install;
//                        --preview <state> --screenshot <file.png>  render one state to an image and exit.
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;

[assembly: AssemblyTitle("LeadsGhr Setup")]
[assembly: AssemblyProduct("LeadsGhr")]
[assembly: AssemblyDescription("Downloads and installs LeadsGhr")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace LeadsGhr.Setup
{
    enum Stage { Preparing, Downloading, Installing, Starting, Failed }

    static class Program
    {
        [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

        [STAThread]
        static int Main(string[] args)
        {
            try { SetProcessDPIAware(); } catch { }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            ServicePointManager.SecurityProtocol |= (SecurityProtocolType)3072; // TLS 1.2 for GitHub

            string feed = "https://github.com/abrarhaider001/LeadsGhr/releases/latest/download/";
            bool dryRun = false;
            string preview = null, screenshot = null;
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--feed" && i + 1 < args.Length) { feed = args[++i]; if (!feed.EndsWith("/")) feed += "/"; }
                else if (args[i] == "--dry-run") dryRun = true;
                else if (args[i] == "--preview" && i + 1 < args.Length) preview = args[++i];
                else if (args[i] == "--screenshot" && i + 1 < args.Length) screenshot = args[++i];
            }

            using (var form = new SetupForm(feed, dryRun))
            {
                if (preview != null && screenshot != null) { form.RenderPreview(preview, screenshot); return 0; }
                Application.Run(form);
                return form.ExitCode;
            }
        }
    }

    /// <summary>The setup window: draws design 3A and runs the download and install.</summary>
    sealed class SetupForm : Form
    {
        const int W = 760, H = 426; // design size of the window body, in 96-DPI pixels

        static readonly Color Ink = Color.FromArgb(0x19, 0x0B, 0x2D);
        static readonly Color Muted = Color.FromArgb(0x67, 0x5E, 0x76);
        static readonly Color Purple = Color.FromArgb(0x5B, 0x12, 0xC9);
        static readonly Color Cyan = Color.FromArgb(0x29, 0xCB, 0xEA);
        static readonly Color Teal = Color.FromArgb(0x1F, 0xA9, 0xC9);
        static readonly Color Track = Color.FromArgb(0xEC, 0xE9, 0xFA);
        static readonly Color Danger = Color.FromArgb(0xB4, 0x23, 0x18);

        readonly string feed;
        readonly bool dryRun;
        readonly PrivateFontCollection fonts = new PrivateFontCollection();
        readonly List<IntPtr> fontMemory = new List<IntPtr>();
        FontFamily regular, semibold, bold;
        readonly Image logo;
        readonly float scale;
        readonly System.Windows.Forms.Timer animation = new System.Windows.Forms.Timer();
        readonly Button retry = new Button();
        readonly string workDir = Path.Combine(Path.GetTempPath(), "LeadsGhrSetup");

        Stage stage = Stage.Preparing;
        long received, total;
        string errorText = "";
        int tick;
        CancellationTokenSource cancel = new CancellationTokenSource();
        WebClient activeDownload;
        public int ExitCode = 1;

        public SetupForm(string feed, bool dryRun)
        {
            this.feed = feed;
            this.dryRun = dryRun;
            LoadFonts();
            logo = Image.FromStream(Resource("logo-256.png"));

            Text = "LeadsGhr Setup";
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.Manual; // centred in OnLoad, once the window has its final size
            BackColor = Color.White;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
            using (var g = CreateGraphics()) scale = g.DpiX / 96f;
            ClientSize = new Size((int)Math.Round(W * scale), (int)Math.Round(H * scale));

            retry.Text = "Try again";
            retry.FlatStyle = FlatStyle.Flat;
            retry.FlatAppearance.BorderSize = 0;
            retry.BackColor = Purple;
            retry.ForeColor = Color.White;
            retry.Font = new Font(semibold, 13f * scale, FontStyle.Regular, GraphicsUnit.Pixel);
            retry.Cursor = Cursors.Hand;
            retry.Bounds = Scaled(new RectangleF(W - 48 - 112, H - 40 - 38, 112, 36));
            retry.Visible = false;
            retry.Click += delegate { retry.Visible = false; Start(); };
            Controls.Add(retry);

            animation.Interval = 30;
            animation.Tick += delegate { tick++; if (stage == Stage.Preparing || stage == Stage.Installing) Invalidate(); };
            animation.Start();
        }

        Rectangle Scaled(RectangleF r)
        {
            return Rectangle.Round(new RectangleF(r.X * scale, r.Y * scale, r.Width * scale, r.Height * scale));
        }

        static Stream Resource(string name)
        {
            Stream s = Assembly.GetExecutingAssembly().GetManifestResourceStream(name);
            if (s == null) throw new InvalidOperationException("Missing resource " + name);
            return s;
        }

        void LoadFonts()
        {
            foreach (string name in new[] { "InstrumentSans-Regular.ttf", "InstrumentSans-SemiBold.ttf", "InstrumentSans-Bold.ttf" })
            {
                using (Stream s = Resource(name))
                {
                    byte[] data = new byte[s.Length];
                    s.Read(data, 0, data.Length);
                    IntPtr ptr = Marshal.AllocCoTaskMem(data.Length);
                    Marshal.Copy(data, 0, ptr, data.Length);
                    fonts.AddMemoryFont(ptr, data.Length);
                    fontMemory.Add(ptr);
                }
            }
            foreach (FontFamily f in fonts.Families)
            {
                // Family names come from the font files; GDI+ may append the style ("Instrument Sans SemiBold SemiBo").
                if (f.Name.StartsWith("Instrument Sans SemiBold")) semibold = f;
                else if (f.Name.StartsWith("Instrument Sans Bold")) bold = f;
                else if (f.Name == "Instrument Sans") regular = f;
            }
            if (regular == null) regular = FontFamily.GenericSansSerif;
            if (semibold == null) semibold = regular;
            if (bold == null) bold = regular;
        }

        // Centre on the screen the mouse is on. FormStartPosition.CenterScreen uses the size from before the
        // DPI-scaled ClientSize applies, which leaves the window low and to the right.
        protected override void OnLoad(EventArgs e)
        {
            base.OnLoad(e);
            Rectangle area = Screen.FromPoint(Cursor.Position).WorkingArea;
            Location = new Point(area.Left + Math.Max(0, (area.Width - Width) / 2), area.Top + Math.Max(0, (area.Height - Height) / 2));
        }

        protected override void OnShown(EventArgs e) { base.OnShown(e); Start(); }

        protected override void OnFormClosing(FormClosingEventArgs e)
        {
            if (stage == Stage.Installing && e.CloseReason == CloseReason.UserClosing) { e.Cancel = true; return; }
            if ((stage == Stage.Preparing || stage == Stage.Downloading) && e.CloseReason == CloseReason.UserClosing)
            {
                if (MessageBox.Show(this, "Cancel LeadsGhr setup?", "LeadsGhr Setup", MessageBoxButtons.YesNo, MessageBoxIcon.Question) != DialogResult.Yes) { e.Cancel = true; return; }
                cancel.Cancel();
                WebClient d = activeDownload;
                if (d != null) d.CancelAsync();
            }
            base.OnFormClosing(e);
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing) { animation.Dispose(); logo.Dispose(); fonts.Dispose(); }
            foreach (IntPtr p in fontMemory) Marshal.FreeCoTaskMem(p);
            fontMemory.Clear();
            base.Dispose(disposing);
        }

        // ---------------------------------------------------------------- Setup steps

        async void Start()
        {
            cancel = new CancellationTokenSource();
            SetStage(Stage.Preparing);
            try
            {
                Directory.CreateDirectory(workDir);
                string yml = await DownloadString(feed + "latest.yml");
                ReleaseInfo info = ReleaseInfo.Parse(yml);

                SetStage(Stage.Downloading);
                total = info.PackageSize + info.InstallerSize;
                received = 0;
                string installer = Path.Combine(workDir, "LeadsGhr-Installer.exe");
                string package = Path.Combine(workDir, "package.7z");
                long installerDone = 0;
                await DownloadFile(feed + Uri.EscapeDataString(info.InstallerPath), installer, delegate(long n) { installerDone = n; received = n; Invalidate(); });
                await DownloadFile(feed + Uri.EscapeDataString(info.PackagePath), package, delegate(long n) { received = installerDone + n; Invalidate(); });
                Verify(installer, info.InstallerSha512);
                Verify(package, info.PackageSha512);

                SetStage(Stage.Installing);
                if (dryRun) { await Task.Delay(3000); }
                else
                {
                    int code = await RunInstaller(installer, package);
                    if (code != 0) throw new SetupException("LeadsGhr could not be installed (error " + code + "). Close LeadsGhr if it is open, then try again.");
                }

                SetStage(Stage.Starting);
                ExitCode = 0;
                try { Directory.Delete(workDir, true); } catch { }
                await Task.Delay(1800);
                Close();
            }
            catch (Exception ex)
            {
                if (cancel.IsCancellationRequested) return;
                errorText = ex is SetupException ? ex.Message : "Could not download LeadsGhr. Check your internet connection and try again.";
                SetStage(Stage.Failed);
            }
        }

        void SetStage(Stage next)
        {
            stage = next;
            retry.Visible = next == Stage.Failed;
            Invalidate();
        }

        WebClient NewClient()
        {
            var client = new WebClient();
            client.Headers[HttpRequestHeader.UserAgent] = "LeadsGhr-Setup";
            return client;
        }

        async Task<string> DownloadString(string url)
        {
            using (WebClient client = NewClient())
            {
                activeDownload = client;
                try { return await client.DownloadStringTaskAsync(new Uri(url)); }
                finally { activeDownload = null; }
            }
        }

        async Task DownloadFile(string url, string path, Action<long> progress)
        {
            using (WebClient client = NewClient())
            {
                activeDownload = client;
                client.DownloadProgressChanged += delegate(object s, DownloadProgressChangedEventArgs e) { progress(e.BytesReceived); };
                try { await client.DownloadFileTaskAsync(new Uri(url), path); }
                finally { activeDownload = null; }
            }
        }

        static void Verify(string path, string expected)
        {
            using (var sha = SHA512.Create())
            using (var file = File.OpenRead(path))
            {
                string actual = Convert.ToBase64String(sha.ComputeHash(file));
                if (actual != expected) throw new SetupException("The download was damaged. Try again.");
            }
        }

        static Task<int> RunInstaller(string installer, string package)
        {
            return Task.Run(delegate
            {
                var start = new ProcessStartInfo(installer, "/S --force-run --package-file=\"" + package + "\"");
                start.UseShellExecute = false;
                using (Process p = Process.Start(start))
                {
                    p.WaitForExit();
                    return p.ExitCode;
                }
            });
        }

        // ---------------------------------------------------------------- Drawing

        public void RenderPreview(string state, string file)
        {
            switch (state)
            {
                case "preparing": stage = Stage.Preparing; tick = 20; break;
                case "installing": stage = Stage.Installing; tick = 40; break;
                case "starting": stage = Stage.Starting; break;
                case "failed": stage = Stage.Failed; errorText = "Could not download LeadsGhr. Check your internet connection and try again."; retry.Visible = true; break;
                default: stage = Stage.Downloading; total = 104000000; received = 46800000; break;
            }
            using (var bmp = new Bitmap(ClientSize.Width, ClientSize.Height))
            {
                using (Graphics g = Graphics.FromImage(bmp)) Draw(g);
                if (stage == Stage.Failed) { IntPtr handle = retry.Handle; retry.DrawToBitmap(bmp, retry.Bounds); }
                bmp.Save(file, System.Drawing.Imaging.ImageFormat.Png);
            }
        }

        protected override void OnPaint(PaintEventArgs e) { Draw(e.Graphics); }

        void Draw(Graphics g)
        {
            g.Clear(Color.White);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.InterpolationMode = InterpolationMode.HighQualityBicubic;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.ScaleTransform(scale, scale);

            DrawFanLines(g);
            DrawBrand(g);
            DrawOrb(g);
            DrawHeadline(g);
            DrawFooter(g);
        }

        // The splash screen's fan lines: quadratic curves from both edges toward the centre (SVG 1600x700, stretched).
        void DrawFanLines(Graphics g)
        {
            float sx = W / 1600f, sy = H / 700f;
            for (int y = -80; y <= 820; y += 53)
            {
                float cy = 350 + (y - 350) * 0.16f;
                DrawFan(g, new PointF(0, y), new PointF(320, cy), new PointF(700, 350), sx, sy, false);
                DrawFan(g, new PointF(1600, y), new PointF(1280, cy), new PointF(900, 350), sx, sy, true);
            }
        }

        static void DrawFan(Graphics g, PointF p0, PointF q, PointF p2, float sx, float sy, bool fromRight)
        {
            // Quadratic -> cubic Bézier.
            var c1 = new PointF(p0.X + 2f / 3f * (q.X - p0.X), p0.Y + 2f / 3f * (q.Y - p0.Y));
            var c2 = new PointF(p2.X + 2f / 3f * (q.X - p2.X), p2.Y + 2f / 3f * (q.Y - p2.Y));
            PointF a = new PointF(p0.X * sx, p0.Y * sy), b = new PointF(c1.X * sx, c1.Y * sy), c = new PointF(c2.X * sx, c2.Y * sy), d = new PointF(p2.X * sx, p2.Y * sy);
            float x0 = Math.Min(a.X, d.X) - 1, x1 = Math.Max(a.X, d.X) + 1;
            Color strong = Color.FromArgb(58, 0x5B, 0x12, 0xC9), clear = Color.FromArgb(0, 0x5B, 0x12, 0xC9);
            using (var brush = new LinearGradientBrush(new PointF(x0, 0), new PointF(x1, 0), fromRight ? clear : strong, fromRight ? strong : clear))
            using (var pen = new Pen(brush, 0.9f))
                g.DrawBezier(pen, a, b, c, d);
        }

        void DrawBrand(Graphics g)
        {
            var tile = new RectangleF(48, 40, 38, 38);
            using (GraphicsPath shadow = RoundRect(new RectangleF(tile.X, tile.Y + 2, tile.Width, tile.Height), 10))
            using (var sb = new SolidBrush(Color.FromArgb(18, Ink))) g.FillPath(sb, shadow);
            using (GraphicsPath path = RoundRect(tile, 10)) { g.FillPath(Brushes.White, path); }
            g.DrawImage(logo, tile.X + 4, tile.Y + 4, 30, 30);

            using (var f = new Font(bold, 24, FontStyle.Regular, GraphicsUnit.Pixel))
            using (var inkBrush = new SolidBrush(Ink))
            using (var purpleBrush = new SolidBrush(Purple))
            {
                StringFormat fmt = StringFormat.GenericTypographic;
                float x = 96, y = 59 - f.GetHeight(g) / 2 + 1;
                g.DrawString("Leads", f, inkBrush, x, y, fmt);
                float w = g.MeasureString("Leads", f, PointF.Empty, fmt).Width;
                g.DrawString("Ghr", f, purpleBrush, x + w, y, fmt);
            }
        }

        void DrawOrb(Graphics g)
        {
            float cx = W - 56 - 85, cy = 70 + 85;
            var outer = new RectangleF(cx - 85, cy - 85, 170, 170);
            using (var path = new GraphicsPath())
            {
                path.AddEllipse(outer);
                using (var brush = new PathGradientBrush(path))
                {
                    brush.CenterColor = Color.FromArgb(0xF4, 0xEE, 0xFF);
                    brush.SurroundColors = new[] { Color.White };
                    g.FillPath(brush, path);
                }
            }
            using (var pen = new Pen(Color.FromArgb(0xD9, 0xCC, 0xF5), 1)) g.DrawEllipse(pen, outer);
            using (var pen = new Pen(Color.FromArgb(0xBD, 0xEF, 0xF8), 1)) g.DrawEllipse(pen, cx - 63, cy - 63, 126, 126);

            // Soft glow under the logo, then the logo (slowly breathing while work is in progress).
            float pulse = (stage == Stage.Preparing || stage == Stage.Installing) ? (float)(Math.Sin(tick / 12.0) * 2) : 0;
            using (var glow = new GraphicsPath())
            {
                glow.AddEllipse(cx - 46, cy - 30, 92, 80);
                using (var brush = new PathGradientBrush(glow))
                {
                    brush.CenterColor = Color.FromArgb(40, Purple);
                    brush.SurroundColors = new[] { Color.FromArgb(0, Purple) };
                    g.FillPath(brush, glow);
                }
            }
            float size = 76 + pulse;
            g.DrawImage(logo, cx - size / 2, cy - size / 2, size, size);
        }

        void DrawHeadline(Graphics g)
        {
            var fmt = StringFormat.GenericTypographic;
            float em = 36;
            // Winding fill: the font has overlapping outlines that the default (alternate) fill would cut out.
            using (var line1 = new GraphicsPath(FillMode.Winding))
            using (var line2 = new GraphicsPath(FillMode.Winding))
            {
                line1.AddString("Your lead workspace is", bold, (int)FontStyle.Regular, em, new PointF(46, 132), fmt);
                line2.AddString(stage == Stage.Starting ? "ready." : "almost ready.", bold, (int)FontStyle.Regular, em, new PointF(46, 172), fmt);
                using (var ink = new SolidBrush(Ink)) g.FillPath(ink, line1);
                RectangleF b = line2.GetBounds();
                using (var grad = new LinearGradientBrush(new PointF(b.Left - 1, 0), new PointF(b.Right + 1, 0), Purple, Teal)) g.FillPath(grad, line2);
            }
            using (var f = new Font(regular, 15, FontStyle.Regular, GraphicsUnit.Pixel))
            using (var brush = new SolidBrush(Muted))
                g.DrawString("Real businesses. Public data. More opportunities.", f, brush, 48, 226, fmt);
        }

        void DrawFooter(Graphics g)
        {
            var fmt = StringFormat.GenericTypographic;
            float left = 48, right = W - 48, trackY = H - 40 - 6;
            string label;
            string detail = "";
            switch (stage)
            {
                case Stage.Preparing: label = "Getting ready…"; break;
                case Stage.Downloading:
                    label = "Downloading LeadsGhr…";
                    int percent = total > 0 ? (int)Math.Min(100, received * 100 / total) : 0;
                    detail = string.Format("{0:0.0} / {1:0} MB · {2}%", received / 1048576.0, total / 1048576.0, percent);
                    break;
                case Stage.Installing: label = "Installing LeadsGhr…"; break;
                case Stage.Starting: label = "Starting LeadsGhr…"; break;
                default: label = "Setup stopped"; break;
            }

            if (stage == Stage.Failed)
            {
                using (var f = new Font(semibold, 13, FontStyle.Regular, GraphicsUnit.Pixel))
                using (var brush = new SolidBrush(Danger)) g.DrawString(label, f, brush, left, trackY - 34, fmt);
                using (var f = new Font(regular, 13, FontStyle.Regular, GraphicsUnit.Pixel))
                using (var brush = new SolidBrush(Muted))
                    g.DrawString(errorText, f, brush, new RectangleF(left, trackY - 14, right - left - 140, 40), fmt);
                return;
            }

            using (var f = new Font(semibold, 13, FontStyle.Regular, GraphicsUnit.Pixel))
            using (var brush = new SolidBrush(Ink)) g.DrawString(label, f, brush, left, trackY - 24, fmt);
            if (detail.Length > 0)
                using (var f = new Font("Consolas", 13, FontStyle.Regular, GraphicsUnit.Pixel))
                using (var brush = new SolidBrush(Muted))
                {
                    SizeF size = g.MeasureString(detail, f, PointF.Empty, fmt);
                    g.DrawString(detail, f, brush, right - size.Width, trackY - 23, fmt);
                }

            var track = new RectangleF(left, trackY, right - left, 6);
            using (GraphicsPath path = RoundRect(track, 3))
            using (var brush = new SolidBrush(Track)) g.FillPath(brush, path);

            RectangleF fill;
            if (stage == Stage.Downloading) fill = new RectangleF(left, trackY, Math.Max(6, track.Width * (total > 0 ? (float)received / total : 0)), 6);
            else if (stage == Stage.Starting) fill = track;
            else
            {
                // Indeterminate: a segment sliding along the track.
                float seg = track.Width * 0.28f, travel = track.Width + seg;
                float x = left - seg + (tick * 6 % (int)travel);
                float x0 = Math.Max(left, x), x1 = Math.Min(right, x + seg);
                if (x1 - x0 < 1) return;
                fill = new RectangleF(x0, trackY, x1 - x0, 6);
            }
            using (GraphicsPath path = RoundRect(fill, 3))
            using (var brush = new LinearGradientBrush(new PointF(left - 1, 0), new PointF(right + 1, 0), Purple, Cyan))
                g.FillPath(brush, path);
        }

        static GraphicsPath RoundRect(RectangleF r, float radius)
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
    }

    sealed class SetupException : Exception
    {
        public SetupException(string message) : base(message) { }
    }

    /// <summary>The parts of electron-builder's latest.yml this program needs.</summary>
    sealed class ReleaseInfo
    {
        public string InstallerPath, InstallerSha512, PackagePath, PackageSha512;
        public long InstallerSize, PackageSize;

        public static ReleaseInfo Parse(string yml)
        {
            var info = new ReleaseInfo();
            bool inPackages = false, inFiles = false;
            foreach (string raw in yml.Replace("\r", "").Split('\n'))
            {
                if (raw.Trim().Length == 0) continue;
                bool top = !raw.StartsWith(" ");
                string line = raw.Trim().TrimStart('-').Trim();
                int colon = line.IndexOf(':');
                if (colon < 0) continue;
                string key = line.Substring(0, colon).Trim();
                string value = line.Substring(colon + 1).Trim().Trim('\'', '"');
                if (top) { inPackages = key == "packages"; inFiles = key == "files"; }
                if (top && key == "path") info.InstallerPath = value;
                else if (top && key == "sha512") info.InstallerSha512 = value;
                else if (inFiles && key == "size" && info.InstallerSize == 0) info.InstallerSize = ParseLong(value);
                else if (inPackages && key == "path") info.PackagePath = value;
                else if (inPackages && key == "sha512") info.PackageSha512 = value;
                else if (inPackages && key == "size") info.PackageSize = ParseLong(value);
            }
            if (string.IsNullOrEmpty(info.InstallerPath) || string.IsNullOrEmpty(info.PackagePath) || string.IsNullOrEmpty(info.PackageSha512) || string.IsNullOrEmpty(info.InstallerSha512))
                throw new SetupException("The LeadsGhr download information is incomplete. Try again later.");
            if (info.InstallerSize == 0) info.InstallerSize = 1000000;
            return info;
        }

        static long ParseLong(string s) { long n; return long.TryParse(s, out n) ? n : 0; }
    }
}
