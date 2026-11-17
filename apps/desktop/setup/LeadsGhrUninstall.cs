// LeadsGhr Uninstall: the branded window shown when someone uninstalls LeadsGhr from Windows.
//
// Windows' uninstall entry runs the electron-builder uninstaller with /S --ask (setup/installer.nsh). Its
// customUnInit runs this program from the app's resources folder:
//   - ask mode (no arguments): "Uninstall LeadsGhr?" with the "Also delete my LeadsGhr data" card,
//     unchecked by default. Exit code 0 = uninstall and keep data, 2 = uninstall and delete data, 1 = cancel.
//     With --watch <file>, Uninstall also starts a copy of this program from %TEMP% in progress mode.
//   - --progress --watch <app.asar> [--deleted]: "Removing LeadsGhr…" until that file is gone,
//     then "LeadsGhr was removed" (closes after a few seconds).
// Automatic updates run the uninstaller without --ask, so they never show this window or delete data.
//
// Options (for testing): --preview <ask|ask-checked|progress|done|done-deleted> --screenshot <file.png>.
// C# 5, built by build-setup.ps1 together with Brand.cs.
using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Text;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using LeadsGhr.Branding;

[assembly: AssemblyTitle("LeadsGhr Uninstall")]
[assembly: AssemblyProduct("LeadsGhr")]
[assembly: AssemblyDescription("Asks how to uninstall LeadsGhr")]
[assembly: AssemblyVersion("1.0.0.0")]
[assembly: AssemblyFileVersion("1.0.0.0")]

namespace LeadsGhr.Uninstall
{
    static class Program
    {
        [DllImport("user32.dll")] static extern bool SetProcessDPIAware();

        [STAThread]
        static int Main(string[] args)
        {
            try { SetProcessDPIAware(); } catch { }
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            bool progress = false, deleted = false;
            string watch = null, preview = null, screenshot = null;
            for (int i = 0; i < args.Length; i++)
            {
                if (args[i] == "--progress") progress = true;
                else if (args[i] == "--deleted") deleted = true;
                else if (args[i] == "--watch" && i + 1 < args.Length) watch = args[++i];
                else if (args[i] == "--preview" && i + 1 < args.Length) preview = args[++i];
                else if (args[i] == "--screenshot" && i + 1 < args.Length) screenshot = args[++i];
            }

            using (var form = new UninstallForm(progress, watch, deleted))
            {
                if (preview != null && screenshot != null) { form.RenderPreview(preview, screenshot); return 0; }
                Application.Run(form);
                return form.ExitCode;
            }
        }
    }

    sealed class UninstallForm : Form
    {
        const int W = 760, H = 426;
        static readonly string Root = (Environment.GetEnvironmentVariable("SystemDrive") ?? "C:") + "\\LeadsGhr";

        enum View { Ask, Removing, Done }

        readonly BrandFonts fonts = new BrandFonts();
        readonly float scale;
        // Buttons are drawn (rounded, brand font) instead of WinForms buttons. hover: 0 none, 1 card, 2 Cancel, 3 confirm.
        RectangleF cancelRect, confirmRect;
        string confirmText = "Uninstall";
        bool showCancel, showConfirm;
        int hover;
        readonly Timer timer = new Timer();
        readonly string watch;
        bool deletedData;
        View view;
        bool deleteData;
        int tick, doneTicks;
        RectangleF card = new RectangleF(48, 154, 664, 68);
        public int ExitCode = 1;

        public UninstallForm(bool progress, string watch, bool deletedData)
        {
            this.watch = watch;
            this.deletedData = deletedData;
            view = progress ? View.Removing : View.Ask;

            Text = "Uninstall LeadsGhr";
            try { Icon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            FormBorderStyle = FormBorderStyle.FixedSingle;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.White;
            KeyPreview = true;
            SetStyle(ControlStyles.AllPaintingInWmPaint | ControlStyles.UserPaint | ControlStyles.OptimizedDoubleBuffer | ControlStyles.ResizeRedraw, true);
            using (var g = CreateGraphics()) scale = g.DpiX / 96f;
            ClientSize = new Size((int)Math.Round(W * scale), (int)Math.Round(H * scale));

            UpdateButtons();

            timer.Interval = 40;
            timer.Tick += delegate { OnTick(); };
            if (view == View.Removing) timer.Start();
        }

        void UpdateButtons()
        {
            float right = W - 48, y = H - 32 - 38;
            if (view == View.Ask)
            {
                confirmText = deleteData ? "Uninstall and delete data" : "Uninstall";
                float w = deleteData ? 214 : 116;
                confirmRect = new RectangleF(right - w, y, w, 38);
                cancelRect = new RectangleF(right - w - 10 - 96, y, 96, 38);
                showCancel = showConfirm = true;
            }
            else
            {
                confirmText = "Close";
                confirmRect = new RectangleF(right - 96, y, 96, 38);
                showCancel = false;
                showConfirm = view == View.Done;
            }
            Invalidate();
        }

        void Confirm()
        {
            if (view == View.Done) { Close(); return; }
            if (view != View.Ask) return;
            ExitCode = deleteData ? 2 : 0;
            StartProgressWindow();
            Close();
        }

        /// <summary>
        /// Shows "Removing LeadsGhr…" while the uninstaller works: a copy of this program in %TEMP%, because the
        /// uninstaller deletes the app folder this one runs from. Failing to show it never stops the uninstall.
        /// </summary>
        void StartProgressWindow()
        {
            try
            {
                string copy = Path.Combine(Path.GetTempPath(), "LeadsGhr-Uninstall.exe");
                if (!string.Equals(Path.GetFullPath(copy), Path.GetFullPath(Application.ExecutablePath), StringComparison.OrdinalIgnoreCase))
                    File.Copy(Application.ExecutablePath, copy, true);
                string args = "--progress" + (deleteData ? " --deleted" : "") + (string.IsNullOrEmpty(watch) ? "" : " --watch \"" + watch + "\"");
                // Start it in %TEMP%: a process whose working directory is the app folder keeps that folder from being deleted.
                System.Diagnostics.Process.Start(new System.Diagnostics.ProcessStartInfo(copy, args) { UseShellExecute = false, WorkingDirectory = Path.GetTempPath() });
            }
            catch { }
        }

        void Cancel() { if (view == View.Ask) { ExitCode = 1; Close(); } }

        void OnTick()
        {
            tick++;
            if (view == View.Removing)
            {
                // Done when the watched app file is gone, or after 90 s whatever happens.
                bool gone = string.IsNullOrEmpty(watch) || !File.Exists(watch);
                if ((gone && tick > 20) || tick > 90 * 25) { view = View.Done; UpdateButtons(); }
                Invalidate();
            }
            else if (view == View.Done && ++doneTicks > 6 * 25) Close();
        }

        bool Hit(RectangleF r, Point p) { return new RectangleF(r.X * scale, r.Y * scale, r.Width * scale, r.Height * scale).Contains(p); }

        int Target(Point p)
        {
            if (view == View.Ask && Hit(card, p)) return 1;
            if (showCancel && Hit(cancelRect, p)) return 2;
            if (showConfirm && Hit(confirmRect, p)) return 3;
            return 0;
        }

        protected override void OnMouseMove(MouseEventArgs e)
        {
            base.OnMouseMove(e);
            int over = Target(e.Location);
            if (over != hover) { hover = over; Cursor = over != 0 ? Cursors.Hand : Cursors.Default; Invalidate(); }
        }

        protected override void OnMouseLeave(EventArgs e) { base.OnMouseLeave(e); if (hover != 0) { hover = 0; Invalidate(); } }

        protected override void OnMouseClick(MouseEventArgs e)
        {
            base.OnMouseClick(e);
            switch (Target(e.Location)) { case 1: Toggle(); break; case 2: Cancel(); break; case 3: Confirm(); break; }
        }

        // Space ticks the card, Enter confirms, Escape cancels.
        protected override bool ProcessCmdKey(ref Message msg, Keys keyData)
        {
            if (keyData == Keys.Space && view == View.Ask) { Toggle(); return true; }
            if (keyData == Keys.Enter) { Confirm(); return true; }
            if (keyData == Keys.Escape) { if (view == View.Done) Close(); else Cancel(); return true; }
            return base.ProcessCmdKey(ref msg, keyData);
        }

        void Toggle() { deleteData = !deleteData; UpdateButtons(); }

        protected override void Dispose(bool disposing)
        {
            if (disposing) { timer.Dispose(); fonts.Dispose(); }
            base.Dispose(disposing);
        }

        // ---------------------------------------------------------------- Drawing

        public void RenderPreview(string state, string file)
        {
            switch (state)
            {
                case "ask-checked": view = View.Ask; deleteData = true; break;
                case "progress": view = View.Removing; tick = 30; break;
                case "done": view = View.Done; break;
                case "done-deleted": view = View.Done; deletedData = true; break;
                default: view = View.Ask; break;
            }
            UpdateButtons();
            using (var bmp = new Bitmap(ClientSize.Width, ClientSize.Height))
            {
                using (Graphics g = Graphics.FromImage(bmp)) Draw(g);
                bmp.Save(file, System.Drawing.Imaging.ImageFormat.Png);
            }
        }

        protected override void OnPaint(PaintEventArgs e) { Draw(e.Graphics); }

        void Draw(Graphics g)
        {
            g.Clear(Color.White);
            g.SmoothingMode = SmoothingMode.AntiAlias;
            g.TextRenderingHint = TextRenderingHint.AntiAliasGridFit;
            g.PixelOffsetMode = PixelOffsetMode.HighQuality;
            g.ScaleTransform(scale, scale);
            Brand.DrawFanLines(g, W, H);

            switch (view)
            {
                case View.Ask:
                    Heading(g, "Uninstall", "LeadsGhr?");
                    Lead(g, "The app is removed from this computer. Your runs, results, settings, and exports stay in " + Root + ", so a reinstall picks up where you left off.");
                    DrawCard(g);
                    break;
                case View.Removing:
                    Heading(g, "Removing", "LeadsGhr…");
                    Lead(g, "This takes a few seconds.");
                    DrawBar(g, false);
                    break;
                default:
                    Heading(g, "LeadsGhr was", "removed.");
                    Lead(g, deletedData
                        ? "Your LeadsGhr data in " + Root + " was deleted too."
                        : "Your runs, results, settings, and exports are still in " + Root + ". Install LeadsGhr again any time to pick up where you left off.");
                    DrawBar(g, true);
                    break;
            }
            if (showCancel) DrawButton(g, cancelRect, "Cancel", false, hover == 2);
            if (showConfirm) DrawButton(g, confirmRect, confirmText, true, hover == 3);
        }

        void DrawButton(Graphics g, RectangleF r, string text, bool primary, bool hot)
        {
            Color fill = !primary ? (hot ? Color.FromArgb(0xF7, 0xF4, 0xFF) : Color.White)
                : view == View.Ask && deleteData ? (hot ? Color.FromArgb(0x96, 0x1D, 0x14) : Brand.Danger)
                : (hot ? Color.FromArgb(0x4E, 0x0F, 0xB0) : Brand.Purple);
            using (GraphicsPath path = Brand.RoundRect(r, 9))
            {
                using (var b = new SolidBrush(fill)) g.FillPath(b, path);
                if (!primary) using (var pen = new Pen(Brand.Line, 1)) g.DrawPath(pen, path);
            }
            using (var f = new Font(fonts.SemiBold, 13.5f, FontStyle.Regular, GraphicsUnit.Pixel))
            using (var b = new SolidBrush(primary ? Color.White : Brand.Ink))
            using (var fmt = new StringFormat(StringFormat.GenericTypographic))
            {
                fmt.Alignment = StringAlignment.Center;
                fmt.LineAlignment = StringAlignment.Center;
                g.DrawString(text, f, b, new RectangleF(r.X, r.Y + 1, r.Width, r.Height), fmt);
            }
        }

        void Heading(Graphics g, string plain, string highlighted)
        {
            var fmt = StringFormat.GenericTypographic;
            // Winding fill: the font has overlapping outlines that the default (alternate) fill would cut out.
            using (var first = new GraphicsPath(FillMode.Winding))
            using (var second = new GraphicsPath(FillMode.Winding))
            {
                first.AddString(plain, fonts.Bold, (int)FontStyle.Regular, 34, new PointF(46, 40), fmt);
                float x = first.GetBounds().Right + 11;
                second.AddString(highlighted, fonts.Bold, (int)FontStyle.Regular, 34, new PointF(x, 40), fmt);
                using (var ink = new SolidBrush(Brand.Ink)) g.FillPath(ink, first);
                RectangleF b = second.GetBounds();
                using (var grad = new LinearGradientBrush(new PointF(b.Left - 1, 0), new PointF(b.Right + 1, 0), Brand.Purple, Brand.Teal)) g.FillPath(grad, second);
            }
        }

        void Lead(Graphics g, string text)
        {
            using (var f = new Font(fonts.Regular, 14, FontStyle.Regular, GraphicsUnit.Pixel))
            using (var brush = new SolidBrush(Brand.Muted))
                g.DrawString(text, f, brush, new RectangleF(48, 94, 600, 48), StringFormat.GenericTypographic);
        }

        void DrawCard(Graphics g)
        {
            Color border = deleteData ? Brand.Danger : (hover == 1 ? Color.FromArgb(0xC9, 0xBF, 0xDD) : Brand.Line);
            if (deleteData)
                using (GraphicsPath ring = Brand.RoundRect(RectangleF.Inflate(card, 3, 3), 15))
                using (var b = new SolidBrush(Brand.DangerSoft)) g.FillPath(b, ring);
            using (GraphicsPath path = Brand.RoundRect(card, 12))
            {
                using (var fill = new SolidBrush(deleteData ? Color.FromArgb(0xFF, 0xFB, 0xFA) : Color.White)) g.FillPath(fill, path);
                using (var pen = new Pen(border, 1)) g.DrawPath(pen, path);
            }

            var tile = new RectangleF(card.X + 18, card.Y + 17, 34, 34);
            using (GraphicsPath p = Brand.RoundRect(tile, 10))
            using (var b = new SolidBrush(Brand.DangerSoft)) g.FillPath(b, p);
            Brand.DrawIcon(g, new RectangleF(tile.X + 8, tile.Y + 8, 18, 18), Brand.Danger, Brand.TrashIcon);

            var fmt = StringFormat.GenericTypographic;
            using (var f = new Font(fonts.SemiBold, 14.5f, FontStyle.Regular, GraphicsUnit.Pixel))
            using (var b = new SolidBrush(deleteData ? Brand.Danger : Brand.Ink))
                g.DrawString("Also delete my LeadsGhr data", f, b, card.X + 66, card.Y + 15, fmt);
            using (var f = new Font(fonts.Regular, 12.5f, FontStyle.Regular, GraphicsUnit.Pixel))
            using (var b = new SolidBrush(Brand.Muted))
                g.DrawString("Deletes everything in " + Root + ". This cannot be undone.", f, b, card.X + 66, card.Y + 38, fmt);

            var box = new RectangleF(card.Right - 18 - 22, card.Y + 23, 22, 22);
            using (GraphicsPath p = Brand.RoundRect(box, 6))
            {
                if (deleteData)
                {
                    using (var b = new SolidBrush(Brand.Danger)) g.FillPath(b, p);
                    Brand.DrawIcon(g, new RectangleF(box.X + 4, box.Y + 4, 14, 14), Color.White, Brand.TickIcon);
                }
                else
                {
                    g.FillPath(Brushes.White, p);
                    using (var pen = new Pen(Color.FromArgb(0xB9, 0xAF, 0xCD), 1.5f)) g.DrawPath(pen, p);
                }
            }
        }

        void DrawBar(Graphics g, bool full)
        {
            float left = 48, right = W - 48, y = 180;
            var track = new RectangleF(left, y, right - left, 6);
            using (GraphicsPath p = Brand.RoundRect(track, 3))
            using (var b = new SolidBrush(Brand.Track)) g.FillPath(b, p);
            RectangleF fill;
            if (full) fill = track;
            else
            {
                float seg = track.Width * 0.28f, travel = track.Width + seg;
                float x = left - seg + (tick * 6 % (int)travel);
                float x0 = Math.Max(left, x), x1 = Math.Min(right, x + seg);
                if (x1 - x0 < 1) return;
                fill = new RectangleF(x0, y, x1 - x0, 6);
            }
            using (GraphicsPath p = Brand.RoundRect(fill, 3))
            using (var b = new LinearGradientBrush(new PointF(left - 1, 0), new PointF(right + 1, 0), Brand.Purple, Brand.Cyan)) g.FillPath(b, p);
        }
    }
}
