import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
  colorSchemes,
  type AspectRatio,
  type IThumbnail,
  type ThumbnailStyle,
} from "../assets/assets";
import SoftBackDrop from "../components/SoftBackDrop";
import AspectRatioSelector from "../components/AspectRatioSelector";
import StyleSelector from "../components/StyleSelector";
import ColorSchemeSelector from "../components/ColorSchemeSelector";
import PreviewPanel from "../components/PreviewPanel";
import { useAuth } from "../context/AuthContext";
import toast from "react-hot-toast";
import api from "../configs/api";

const MAX_POLL_ATTEMPTS = 30;
const POLL_INTERVAL = 5000;
const INITIAL_POLL_DELAY = 3000;

const Generate = () => {
  const { id } = useParams();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { isLoggedIn } = useAuth();

  const [title, setTitle] = useState("");
  const [additionalDetails, setAdditionalDetails] = useState("");
  const [thumbnail, setThumbnail] = useState<IThumbnail | null>(null);
  const [status, setStatus] = useState<
    "idle" | "generating" | "completed" | "error"
  >("idle");

  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("16:9");
  const [colorSchemeId, setColorSchemeId] = useState<
    (typeof colorSchemes)[number]["id"]
  >(colorSchemes[0].id);
  const [style, setStyle] = useState<ThumbnailStyle>("Bold & Graphic");
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);

  const pollAttemptsRef = useRef(0);
  const intervalRef = useRef<number | null>(null);

  /* ---------------- GENERATE ---------------- */

  const handleGenerate = async () => {
    if (!isLoggedIn) return toast.error("Please login to generate thumbnails");
    if (!title.trim()) return toast.error("Title is required");

    setStatus("generating");
    pollAttemptsRef.current = 0;

    try {
      const { data } = await api.post("/api/thumbnail/generate", {
        title,
        prompt: additionalDetails,
        style,
        aspect_ratio: aspectRatio,
        color_scheme: colorSchemeId,
        text_overlay: true,
      });

      if (!data?.thumbnail?._id) throw new Error("No ID returned");

      toast.success(data.message || "Generation started!");
      navigate(`/generate/${data.thumbnail._id}`);
    } catch (error: any) {
      toast.error(
        error?.response?.data?.message || "Failed to start generation",
      );
      setStatus("error");
    }
  };

  /* ---------------- FETCH ---------------- */

  const fetchThumbnail = async () => {
    if (!id) return;

    try {
      const { data } = await api.get(`/api/user/thumbnails/${id}`);
      if (!data?.thumbnail) return;

      const t: IThumbnail = data.thumbnail;

      setThumbnail(t);
      setTitle(t.title || "");
      setAdditionalDetails(t.user_prompt || "");
      setColorSchemeId(t.color_scheme || colorSchemes[0].id);
      setAspectRatio(t.aspect_ratio || "16:9");
      setStyle(t.style || "Bold & Graphic");

      if (t.image_url) {
        setStatus("completed");
        toast.success("Thumbnail generated!");
        stopPolling();
        return;
      }

      if (t.isGenerating === false) {
        setStatus("error");
        toast.error("Generation failed. Please try again.");
        stopPolling();
      }
    } catch {
      pollAttemptsRef.current += 1;

      if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
        setStatus("error");
        toast.error("Generation timed out. Try again.");
        stopPolling();
      }
    }
  };

  /* ---------------- POLLING ---------------- */

  const startPolling = () => {
    stopPolling();

    setTimeout(() => {
      fetchThumbnail();
      intervalRef.current = setInterval(fetchThumbnail, POLL_INTERVAL);
    }, INITIAL_POLL_DELAY);
  };

  const stopPolling = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  /* ---------------- EFFECTS ---------------- */

  useEffect(() => {
    if (!id || !isLoggedIn) return;

    const init = async () => {
      try {
        const { data } = await api.get(`/api/user/thumbnails/${id}`);
        if (!data?.thumbnail) return;

        const t: IThumbnail = data.thumbnail;

        setThumbnail(t);
        setTitle(t.title || "");
        setAdditionalDetails(t.user_prompt || "");
        setColorSchemeId(t.color_scheme || colorSchemes[0].id);
        setAspectRatio(t.aspect_ratio || "16:9");
        setStyle(t.style || "Bold & Graphic");

        if (t.image_url) {
          setStatus("completed");
        } else if (t.isGenerating) {
          setStatus("generating");
          pollAttemptsRef.current = 0;
          startPolling();
        } else {
          setStatus("error");
        }
      } catch {
        setStatus("error");
      }
    };

    init();

    return stopPolling;
  }, [id, isLoggedIn]);

  useEffect(() => {
    if (!id) {
      setThumbnail(null);
      setStatus("idle");
      stopPolling();
    }
  }, [pathname]);

  const isDisabled = status === "generating";

  /* ---------------- UI (UNCHANGED) ---------------- */

  return (
    <>
      <SoftBackDrop />
      <div className="pt-24 min-h-screen">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-28 lg:pb-8">
          <div className="grid lg:grid-cols-[400px_1fr] gap-8">
            {/* Left Panel */}
            <div
              className={`space-y-6 ${
                isDisabled ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <div className="p-6 rounded-2xl bg-white/8 border border/white/12 shadow-xl space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-zinc-100 mb-1">
                    Create your Thumbnail
                  </h2>
                  <p className="text-sm text-zinc-400">
                    Describe your vision and let AI bring it to life
                  </p>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium py-1">
                      Title or Topic
                    </label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={100}
                      placeholder="e.g., 10 Tips for Better Sleep"
                      className="w-full px-4 py-3 rounded-lg border border-white/12 bg-black/20 text-zinc-100"
                    />
                  </div>

                  <AspectRatioSelector
                    value={aspectRatio}
                    onChange={setAspectRatio}
                  />

                  <StyleSelector
                    value={style}
                    onChange={setStyle}
                    isOpen={styleDropdownOpen}
                    setIsOpen={setStyleDropdownOpen}
                  />

                  <ColorSchemeSelector
                    value={colorSchemeId}
                    onChange={(c: string) =>
                      setColorSchemeId(c as (typeof colorSchemes)[number]["id"])
                    }
                  />

                  <textarea
                    value={additionalDetails}
                    onChange={(e) => setAdditionalDetails(e.target.value)}
                    rows={3}
                    placeholder="Additional prompts (optional)"
                    className="w-full px-4 py-3 rounded-lg border border-white/10 bg-white/6 text-zinc-100 resize-none"
                  />
                </div>

                {!id && (
                  <button
                    onClick={handleGenerate}
                    disabled={isDisabled}
                    className="text-[15px] w-full py-3.5 rounded-xl font-medium bg-linear-to-b from-pink-500 to-pink-600"
                  >
                    {isDisabled ? "Generating..." : "Generate Thumbnail"}
                  </button>
                )}

                {status === "error" && id && (
                  <button
                    onClick={() => navigate("/generate")}
                    className="text-[15px] w-full py-3.5 rounded-xl font-medium bg-red-500"
                  >
                    Retry Generation
                  </button>
                )}
              </div>
            </div>

            {/* Right Panel */}
            <div>
              <div className="p-6 rounded-2xl bg-white/8 border border-white/10 shadow-xl">
                <h2 className="text-lg font-semibold text-zinc-100">Preview</h2>
                <PreviewPanel
                  thumbnail={thumbnail}
                  isLoading={status === "generating"}
                  aspectRatio={aspectRatio}
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default Generate;
