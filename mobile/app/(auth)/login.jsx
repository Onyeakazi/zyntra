import { Image, Pressable, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { router } from 'expo-router'
import Constants, { ExecutionEnvironment } from 'expo-constants';
import Logo from "../../assets/images/logo2.png";
import TYPOGRAHPY from "../../constants/typography";
import { useEffect, useState } from 'react';
import Button from '../../components/Button';
import GoogleIcon from "../../assets/vectors/google.svg";
import FloatingInput from '../../components/Input';
import { auth } from "../../config/firebase";
import { supabase } from "../../lib/supabase";
import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile
} from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleAuthProvider, signInWithCredential } from "firebase/auth";

// Check if running in Expo Go
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// Configure Google Sign-In (only if not in Expo Go)
if (!isExpoGo) {
  try {
    const { GoogleSignin } = require('@react-native-google-signin/google-signin');
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      forceCodeForRefreshToken: false,
      offlineAccess: true,
    });
  } catch (error) {
    console.warn("Failed to configure Google Sign-In:", error);
  }
}

const mapAuthErrorToMessage = (error) => {
    console.error("Auth Error:", error.code, error.message);
    switch (error.code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Incorrect email or password. Please check your credentials and try again.';
        case 'auth/invalid-email':
            return 'Please enter a valid email address.';
        case 'auth/email-already-in-use':
            return 'This email address is already in use by another account.';
        case 'auth/weak-password':
            return 'Password should be at least 6 characters.';
        case 'auth/too-many-requests':
            return 'Too many login attempts. Your account has been temporarily locked. Please try again later.';
        case 'auth/network-request-failed':
            return 'Network error. Please check your internet connection and try again.';
        default:
            if (error.message && error.message.includes('Firebase:')) {
                return error.message.replace('Firebase:', '').replace(/\(auth\/.*\)\.?/, '').trim();
            }
            return error.message || 'An error occurred. Please try again.';
    }
};

const Login = () => {
    const [active, setActive] = useState("signin");
    const [isFocused, setIsFocused] = useState(false);
    const [fullName, setFullName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fieldError, setFieldError] = useState({
        fullName: false,
        email: false,
        password: false,
        confirmPassword: false,
    });
    const [success, setSuccess] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const [signinData, setSigninData] = useState({
        email: "",
        password: "",
    });

    const [signupData, setSignupData] = useState({
        fullName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });

    // Handle Google Sign-In
    const handleGoogleSignIn = async () => {
        // Check if in Expo Go
        if (isExpoGo) {
            alert("Google Sign-In is not available in Expo Go.\n\nPlease use the built APK to test Google Sign-In.\n\nYou can still test email/password login here!");
            return;
        }

        try {
            const { GoogleSignin } = require('@react-native-google-signin/google-signin');
            await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
            const userInfo = await GoogleSignin.signIn();
            const { idToken } = userInfo.data;

            if (!idToken) {
                alert("Failed to get ID token");
                return;
            }

            // Sign into Firebase
            const credential = GoogleAuthProvider.credential(idToken);
            const userCredential = await signInWithCredential(auth, credential);
            const firebaseUser = userCredential.user;

            // Check if user exists in Supabase
            const { data: existingUser, error: checkError } = await supabase
                .from("users")
                .select("id")
                .eq("id", firebaseUser.uid)
                .single();

            if (checkError || !existingUser) {
                // Generate a clean and unique username from full name
                const nameSource = firebaseUser.displayName || firebaseUser.email || "user";
                const baseUsername = nameSource.includes('@')
                    ? nameSource.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
                    : nameSource.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
                const username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;

                const { error: supabaseError } = await supabase
                    .from("users")
                    .insert({
                        id: firebaseUser.uid,
                        email: firebaseUser.email || "",
                        full_name: firebaseUser.displayName || "Google User",
                        username: username,
                        avatar_url: firebaseUser.photoURL || "",
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });

                if (supabaseError) {
                    console.error("Supabase insert error for Google user:", supabaseError);
                }
            }

            await AsyncStorage.setItem("user_logged_in", "true");

            alert("Google login successful!");
            router.push("/(tabs)");
        } catch (error) {
            const { statusCodes } = require('@react-native-google-signin/google-signin');
            if (error.code === statusCodes.SIGN_IN_CANCELLED) {
                alert("Sign in cancelled");
            } else if (error.code === statusCodes.IN_PROGRESS) {
                alert("Sign in in progress");
            } else {
                alert("Google Sign-In Error: " + error.message);
            }
        }
    };

    const handleSignup = async () => {
        let errors = {
            fullName: false,
            email: false,
            password: false,
            confirmPassword: false,
        };

        let message = "";

        // ALL FIELDS EMPTY
        if (
            !signupData.fullName.trim() &&
            !signupData.email.trim() &&
            !signupData.password.trim() &&
            !signupData.confirmPassword.trim()
        ) {
            errors = {
                fullName: true,
                email: true,
                password: true,
                confirmPassword: true,
            };

            setFieldError(errors);
            setError("Please fill all fields");
            return;
        }

        if (!signupData.fullName.trim()) {
            errors.fullName = true;
            message = "Full name is required";
        }

        if (!signupData.email.trim()) {
            errors.email = true;
            message = message || "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(signupData.email)) {
            errors.email = true;
            message = message || "Enter a valid email";
        }

        if (!signupData.password.trim()) {
            errors.password = true;
            message = message || "Password is required";
        } else if (signupData.password.length < 6) {
            errors.password = true;
            message = message || "Password should be at least 6 characters";
        }

        if (!signupData.confirmPassword.trim()) {
            errors.confirmPassword = true;
            message = message || "Confirm your password";
        } else if (signupData.password !== signupData.confirmPassword) {
            errors.confirmPassword = true;
            message = message || "Passwords do not match";
        }

        setFieldError(errors);

        if (
            errors.fullName ||
            errors.email ||
            errors.password ||
            errors.confirmPassword
        ) {
            setError(message || "Please fix the errors");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const userCredential = await createUserWithEmailAndPassword(
                auth,
                signupData.email,
                signupData.password
            );

            await updateProfile(userCredential.user, {
                displayName: signupData.fullName,
            });

            // Generate unique username for Supabase from full name
            const baseUsername = signupData.fullName
                ? signupData.fullName.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
                : signupData.email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
            const username = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;

            // Create Supabase User Profile
            const { error: supabaseError } = await supabase
                .from("users")
                .insert({
                    id: userCredential.user.uid,
                    email: signupData.email,
                    full_name: signupData.fullName,
                    username: username,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });

            if (supabaseError) {
                console.error("Supabase insert error:", supabaseError);
                throw new Error("Could not sync user profile to database: " + supabaseError.message);
            }

            await AsyncStorage.setItem("user_logged_in", "true");

            setSuccess(true);
            alert("Account created successfully!");
            router.push("/(tabs)");
        } catch (error) {
            setError(mapAuthErrorToMessage(error));
        } finally {
            setLoading(false);
        }
    };

    const handleSignin = async () => {
        let errors = {
            email: false,
            password: false,
        };

        let message = "";

        // ALL FIELDS EMPTY
        if (!signinData.email.trim() && !signinData.password.trim()) {
            errors.email = true;
            errors.password = true;

            setFieldError((prev) => ({ ...prev, ...errors }));
            setError("Please fill all fields");
            return;
        }

        // email validation
        if (!signinData.email.trim()) {
            errors.email = true;
            message = "Email is required";
        } else if (!/\S+@\S+\.\S+/.test(signinData.email)) {
            errors.email = true;
            message = "Enter a valid email";
        }

        // password validation
        if (!signinData.password.trim()) {
            errors.password = true;
            message = message || "Password is required";
        }

        setFieldError((prev) => ({ ...prev, ...errors }));

        if (errors.email || errors.password) {
            setError(message || "Please fix the errors");
            return;
        }

        setError("");
        setLoading(true);

        try {
            await signInWithEmailAndPassword(
                auth,
                signinData.email,
                signinData.password
            );

            await AsyncStorage.setItem("user_logged_in", "true");

            setSuccess(true);
            alert("Login successful!");
            router.push("/(tabs)");
        } catch (error) {
            setError(mapAuthErrorToMessage(error));
        } finally {
            setLoading(false);
        }
    };

  return (
    <View style={{flex: 1}}>
        <View style={{paddingVertical: 30}}>
            <Image 
                source={Logo}
                style={{
                    width: "100%",
                    height: 90,
                    resizeMode: "contain"
                }}
            />
        </View>

        <View>
            <View style={styles.authBtns}>
                <TouchableOpacity 
                    onPress={()=> 
                        setActive("signin")
                    }
                >
                    <Text style={[styles.btn, active === "signin" && styles.activeText]}>Sign in</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                    onPress={()=> setActive("signup")}
                >
                    <Text style={[styles.btn, active === "signup" && styles.activeText]}>Sign up</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.lines}></View>
            <View
                style={[
                    styles.active,
                    {
                        position: "absolute",
                        top: 40,
                        left: active === "signin" ? 0 : "26%",
                    },
                ]}
            />

            {active === "signin" ? (
                <View>
                    <View style={styles.inputField}>

                        <FloatingInput
                            placeholder="Email"
                            value={signinData.email}
                            onChangeText={(text) => {
                                setEmail(text);
                                setSigninData({...signinData, email: text});
                                setFieldError({...fieldError, email: false});
                                setError("");
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.email ? "red" : success ? "green" : "#ccc"}}
                        />

                        <FloatingInput
                            placeholder="Password"
                            value={signinData.password}
                            onChangeText={(text) => {
                                setPassword(text);
                                setSigninData({...signinData, password: text});
                                setFieldError({...fieldError, password: false});
                                setError("");
                            }}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.password ? "red" : success ? "green" : "#ccc"}}
                            secureTextEntry={!showPassword}
                            showToggle
                            onToggle={() => setShowPassword(!showPassword)}
                        />

                        {error ? (
                            <Text style={{color: "red", marginTop: 5, fontFamily: TYPOGRAHPY.regular}}>{error}</Text>
                        ) : null}

                        <View>
                            <TouchableOpacity 
                                onPress={()=> router.push("/(auth)/forgotpassword")}
                            >
                                <Text style={{textAlign: "right", fontFamily: TYPOGRAHPY.semiBold, fontSize: 16}}>Forgot Password?</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    <View style={{marginTop: 40}}>
                        <Button 
                            text={"Login"}
                            action={handleSignin}
                            bgColor={"#438def"}
                            textColor={"#FFFFFF"}
                            style={{paddingVertical: 17}}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 15}}>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                        <Text style={{textAlign: "center", fontFamily: TYPOGRAHPY.regular, fontSize: 16, color: "#949494"}}>Or continue with</Text>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20}}>
                        <Button 
                            text={"Google"}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<GoogleIcon width={16} height={16}/>}
                            style={styles.authBtn}
                            action={handleGoogleSignIn}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", marginTop: 30}}>
                        <Text style={{fontFamily: TYPOGRAHPY.medium, fontSize: 16, color: "#656F78"}}>
                            {"Don't have an Account "}
                            <Text onPress={() => setActive("signup")} style={{ color: "#5398F1" }}>
                                Sign Up
                            </Text>
                        </Text>
                    </View>
                </View>
            ) : (
                <View>
                    <View style={styles.inputField}>

                        <FloatingInput
                            placeholder="Full Name"
                            value={signupData.fullName}
                            onChangeText={(text) => setSignupData({...signupData, fullName: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.fullName ? "red" : success ? "green" : "#ccc"}}

                        />

                        <FloatingInput
                            placeholder="Email"
                            value={signupData.email}
                            onChangeText={(text) => setSignupData({...signupData, email: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.email ? "red" : success ? "green" : "#ccc"}}
                        />

                        <FloatingInput
                            placeholder="Password"
                            value={signupData.password}
                            onChangeText={(text) => setSignupData({...signupData, password: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.password ? "red" : success ? "green" : "#ccc"}}
                            secureTextEntry={!showPassword}
                            showToggle
                            onToggle={() => setShowPassword(!showPassword)}
                        />

                        <FloatingInput
                            placeholder="Confirm Password"
                            value={signupData.confirmPassword}
                            onChangeText={(text) => setSignupData({...signupData, confirmPassword: text})}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            style={{borderColor: fieldError.confirmPassword ? "red" : success ? "green" : "#ccc"}}
                            secureTextEntry={!showConfirmPassword}
                            showToggle
                            onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                        />
                    </View>

                    {error ? (
                        <Text style={{color: "red", marginTop: 5, fontFamily: TYPOGRAHPY.regular}}>{error}</Text>
                    ) : null}

                    <View style={{marginTop: 40}}>
                        <Button 
                            text={"Join Now"}
                            action={handleSignup}
                            bgColor={"#438def"}
                            textColor={"#FFFFFF"}
                            style={{paddingVertical: 17}}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 10, marginTop: 15}}>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                        <Text style={{textAlign: "center", fontFamily: TYPOGRAHPY.regular, fontSize: 16, color: "#949494"}}>Or Sign up with</Text>
                        <View style={{marginVertical: 20, height: 1, backgroundColor: "#C4C4C4", width: "25%"}}/>
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 20}}>
                        <Button 
                            text={"Google"}
                            bgColor={"#FFFFFF"}
                            textColor={"#656F78"}
                            icon={<GoogleIcon width={16} height={16}/>}
                            style={styles.authBtn}
                            action={handleGoogleSignIn}
                        />
                    </View>

                    <View style={{flexDirection: "row", justifyContent: "center", marginTop: 30}}>
                        <Text style={{fontFamily: TYPOGRAHPY.medium, fontSize: 16, color: "#656F78"}}>
                            Already have an Account{" "}
                            <Text onPress={() => setActive("signin")} style={{ color: "#5398F1" }}>
                                Sign in
                            </Text>
                        </Text>
                    </View>

                </View>
            )}
        </View>
    </View>
  )
}

export default Login

const styles = StyleSheet.create({
    authBtns: {
        flexDirection: "row",
        justifyContent: "end",
        alignItems: "center",
        gap: 30,
    },

    btn: {
        fontSize: 18,
        fontFamily: TYPOGRAHPY.regular,
        color: "#949494",
    },

    lines: {
        height: 2,
        width: "100%",
        backgroundColor: "#C4C4C4",
        marginTop: 15
    },

    active: {
        backgroundColor: "#0779B8",
        height: 2,
        width: "20%",
    },

    activeText: {
        fontFamily: TYPOGRAHPY.semiBold,
        color: "#0000009c",
    },

    inputContainer: {
        borderWidth: 1,
        borderColor: "#ccc",
        borderRadius: 10,
        paddingTop: 18,
        paddingHorizontal: 12,
    },

    label: {
        left: 12,
        color: "#999",
    },

    labelActive: {
        top: -3,
        fontSize: 12,
        backgroundColor: "#fff",
        paddingHorizontal: 4,
    },

    input: {
        height: 50,
        fontSize: 16,
    },

    inputField: {
        marginTop: 30,
    },

    authBtn: {
        paddingHorizontal: 35,
        paddingVertical: 10,
        borderRadius: 10,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#656F78",
        fontSize: 14,
        fontFamily: TYPOGRAHPY.medium,
    }
})